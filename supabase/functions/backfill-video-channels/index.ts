/**
 * backfill-video-channels — resolves missing curated_videos.channel_id.
 *
 * Why: a large slice of the corpus was ingested without a resolved YouTube
 * channel id. Those rows are invisible to channel-trust promotion and to the
 * per-creator diversity caps, so they sit in pending_review forever.
 *
 * Cost: youtube videos.list is 1 quota unit per call and accepts 50 ids, so a
 * full pass over hundreds of thousands of rows costs a few thousand units —
 * ~100x cheaper than resolving channels via search.
 *
 * Auth: x-cron-secret (CRON_SECRET) or admin JWT.
 * Idempotent: only touches rows where channel_id IS NULL.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const YOUTUBE_API_KEY =
  Deno.env.get('YOUTUBE_API_KEY') ?? Deno.env.get('YOUTUBE_API_KEY_2') ?? '';

const IDS_PER_CALL = 50;
const SOFT_DEADLINE_MS = 60_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Row = { id: string; video_id: string; channel_title: string | null };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const cronSecret = req.headers.get('x-cron-secret');
    const cronToken = req.headers.get('x-cron-token');
    const isCron =
      (!!cronSecret && cronSecret === Deno.env.get('CRON_SECRET')) ||
      (!!cronToken && cronToken === Deno.env.get('INGEST_CRON_TOKEN'));
    if (!isCron) {
      const authHeader = req.headers.get('Authorization') ?? '';
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
    }

    if (!YOUTUBE_API_KEY) return json({ error: 'YOUTUBE_API_KEY not configured' }, 500);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(2000, Math.max(50, Number(body?.limit ?? 1000)));
    const enqueueCandidates: boolean = body?.enqueue_candidates !== false;
    const promote: boolean = body?.promote !== false;

    const started = Date.now();

    const { data: rows, error: rowsErr } = await admin
      .from('curated_videos')
      .select('id, video_id, channel_title')
      .is('channel_id', null)
      .not('video_id', 'is', null)
      .limit(limit);
    if (rowsErr) return json({ error: 'query failed', detail: rowsErr.message }, 500);

    const list = (rows ?? []) as Row[];
    let resolved = 0;
    let calls = 0;
    let missing = 0;
    const channelMeta = new Map<string, string>(); // channelId -> title

    for (let i = 0; i < list.length; i += IDS_PER_CALL) {
      if (Date.now() - started > SOFT_DEADLINE_MS) break;
      const chunk = list.slice(i, i + IDS_PER_CALL);
      const ids = chunk.map((r) => r.video_id).join(',');
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(ids)}&key=${YOUTUBE_API_KEY}`,
      );
      calls++;
      if (!res.ok) {
        console.error('youtube videos.list failed', res.status, await res.text().catch(() => ''));
        if (res.status === 403) break; // quota — stop cleanly
        continue;
      }
      const payload = await res.json();
      const byVideo = new Map<string, { channelId: string; channelTitle: string }>();
      for (const item of payload?.items ?? []) {
        const cid = item?.snippet?.channelId;
        if (cid) {
          byVideo.set(item.id, { channelId: cid, channelTitle: item?.snippet?.channelTitle ?? '' });
          channelMeta.set(cid, item?.snippet?.channelTitle ?? '');
        }
      }

      for (const row of chunk) {
        const hit = byVideo.get(row.video_id);
        if (!hit) {
          missing++;
          continue;
        }
        const { error: updErr } = await admin
          .from('curated_videos')
          .update({
            channel_id: hit.channelId,
            channel_title: row.channel_title ?? hit.channelTitle,
          })
          .eq('id', row.id)
          .is('channel_id', null);
        if (!updErr) resolved++;
      }
    }

    // Feed newly seen channels into the normal candidate queue so they get
    // classified + verified. Never auto-approve here.
    let candidatesQueued = 0;
    if (enqueueCandidates && channelMeta.size > 0) {
      const ids = [...channelMeta.keys()];
      const { data: known } = await admin
        .from('approved_channels')
        .select('youtube_channel_id')
        .in('youtube_channel_id', ids);
      const { data: existing } = await admin
        .from('channel_candidates')
        .select('youtube_channel_id')
        .in('youtube_channel_id', ids);
      const seen = new Set<string>([
        ...((known ?? []) as { youtube_channel_id: string }[]).map((r) => r.youtube_channel_id),
        ...((existing ?? []) as { youtube_channel_id: string }[]).map((r) => r.youtube_channel_id),
      ]);
      const toInsert = ids
        .filter((id) => !seen.has(id))
        .map((id) => ({
          youtube_channel_id: id,
          title: channelMeta.get(id) ?? id,
          status: 'pending',
          // Must be one of the channel_candidates_source_check values.
          // The orphan-backfill origin is recorded in discovery_method.
          source: 'discovery',
          discovery_method: 'orphan_backfill:video_snippet',
        }));
      if (toInsert.length > 0) {
        const { error: insErr, count } = await admin
          .from('channel_candidates')
          .upsert(toInsert, { onConflict: 'youtube_channel_id', ignoreDuplicates: true, count: 'exact' });
        if (insErr) console.error('candidate insert failed', insErr.message);
        else candidatesQueued = count ?? toInsert.length;
      }
    }

    // Drain review backlog for rows whose channel is already trusted.
    let promoted = 0;
    if (promote) {
      const { data: promoRes, error: promoErr } = await admin.rpc(
        'promote_trusted_pending_videos',
        { _limit: 5000 },
      );
      if (promoErr) console.error('promotion failed', promoErr.message);
      else promoted = Number((promoRes as { promoted?: number } | null)?.promoted ?? 0);
    }

    const { count: remaining } = await admin
      .from('curated_videos')
      .select('id', { count: 'exact', head: true })
      .is('channel_id', null);

    return json({
      ok: true,
      scanned: list.length,
      youtube_calls: calls,
      quota_units_estimate: calls,
      resolved,
      unresolved_videos: missing,
      candidates_queued: candidatesQueued,
      promoted,
      remaining_orphans: remaining ?? null,
    });
  } catch (e) {
    console.error('backfill-video-channels error', e);
    return json({ error: 'internal error', detail: String(e) }, 500);
  }
});
