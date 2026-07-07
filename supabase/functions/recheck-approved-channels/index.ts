import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXCLUSION_KEYWORDS = [
  'music video', 'song', 'dance', 'sexy', 'bikini', 'alcohol',
  'gambling', 'casino', 'gaming', 'prank', 'reaction', 'meme',
];

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? Deno.env.get('YOUTUBE_API_KEY_2');
const CRON_TOKEN = Deno.env.get('AUDIT_CRON_TOKEN');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Authorize: either admin JWT or cron token
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronHeader = req.headers.get('x-cron-token') ?? '';
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let allowed = CRON_TOKEN && cronHeader === CRON_TOKEN;
  if (!allowed && authHeader) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
      allowed = !!isAdmin;
    }
  }
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Pick channels not rechecked in 24h (up to 50)
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: channels } = await admin
      .from('approved_channels')
      .select('*')
      .or(`last_rechecked_at.is.null,last_rechecked_at.lt.${cutoff}`)
      .eq('status', 'active')
      .limit(50);

    const results: any[] = [];
    for (const ch of channels ?? []) {
      let flagged = false;
      let reason = '';
      const evidence: any = { previous_title: ch.title, checked_at: new Date().toISOString() };

      if (!YOUTUBE_API_KEY) {
        results.push({ id: ch.id, skipped: true });
        continue;
      }

      const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${ch.youtube_channel_id}&key=${YOUTUBE_API_KEY}`
      );
      const chJson = await chRes.json();
      const ytData = chJson.items?.[0];

      if (!ytData) {
        flagged = true; reason = 'channel_deleted';
        evidence.deleted = true;
      } else {
        const newTitle = ytData.snippet?.title ?? '';
        evidence.current_title = newTitle;
        if (newTitle && newTitle !== ch.title) {
          flagged = true; reason = 'renamed';
          evidence.renamed_from = ch.title;
          evidence.renamed_to = newTitle;
        }

        const uploadsPlaylist = ytData.contentDetails?.relatedPlaylists?.uploads;
        if (uploadsPlaylist) {
          const upRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${uploadsPlaylist}&key=${YOUTUBE_API_KEY}`
          );
          const upJson = await upRes.json();
          const titles: string[] = (upJson.items ?? []).map((it: any) => it.snippet?.title ?? '');
          const hay = titles.join(' ').toLowerCase();
          const hits = EXCLUSION_KEYWORDS.filter((k) => hay.includes(k));
          evidence.recent_titles = titles;
          evidence.exclusion_hits = hits;
          if (hits.length > 0) {
            flagged = true;
            reason = reason ? `${reason},content_drift` : 'content_drift';
          }
        }
      }

      await admin.from('approved_channels').update({
        last_rechecked_at: new Date().toISOString(),
        status: flagged ? 'flagged' : ch.status,
        consistency_score: flagged ? Math.max(0, (ch.consistency_score ?? 100) - 20) : ch.consistency_score,
      }).eq('id', ch.id);

      await admin.from('channel_audit_log').insert({
        channel_ref: ch.id,
        youtube_channel_id: ch.youtube_channel_id,
        action: flagged ? 'flagged' : 'rechecked',
        confidence: flagged ? 40 : 95,
        evidence, reason: flagged ? reason : 'ok',
      });

      results.push({ id: ch.id, flagged, reason });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('recheck error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
