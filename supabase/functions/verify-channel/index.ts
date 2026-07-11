import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { enforceRateLimit } from '../_shared/rateLimit.ts';

const EXCLUSION_KEYWORDS = [
  'music', 'song', 'dance', 'sexy', 'bikini', 'alcohol', 'beer', 'wine',
  'gambling', 'casino', 'gaming', 'gta', 'prank', 'reaction', 'meme',
  'celebrity gossip', 'dating', 'kissing', 'fuck', 'shit', 'bitch',
  'twerk', 'lingerie', 'nightclub', 'lip sync', 'tiktok dance',
];

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? Deno.env.get('YOUTUBE_API_KEY_2');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { youtube_channel_id, handle, title: fallbackTitle, category, source } = body;
    if (!youtube_channel_id) {
      return new Response(JSON.stringify({ error: 'youtube_channel_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch channel from YouTube
    let ytData: any = null;
    let latestTitles: string[] = [];
    if (YOUTUBE_API_KEY) {
      const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(youtube_channel_id)}&key=${YOUTUBE_API_KEY}`
      );
      const chJson = await chRes.json();
      ytData = chJson.items?.[0] ?? null;
      if (ytData?.contentDetails?.relatedPlaylists?.uploads) {
        const upRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${ytData.contentDetails.relatedPlaylists.uploads}&key=${YOUTUBE_API_KEY}`
        );
        const upJson = await upRes.json();
        latestTitles = (upJson.items ?? []).map((it: any) => it.snippet?.title ?? '');
      }
    }

    const title = ytData?.snippet?.title ?? fallbackTitle ?? 'Unknown';
    const description = ytData?.snippet?.description ?? '';
    const subs = Number(ytData?.statistics?.subscriberCount ?? 0);

    // Exclusion scan
    const haystack = `${title} ${description} ${latestTitles.join(' ')}`.toLowerCase();
    const exclusionHits = EXCLUSION_KEYWORDS.filter((kw) => haystack.includes(kw));

    // Duplicate check
    const { data: dupRows } = await admin.rpc('check_channel_duplicate', {
      _yt_id: youtube_channel_id, _title: title, _handle: handle ?? null,
    });
    const dup = dupRows?.[0];
    const duplicateRisk = !dup ? 'low' : dup.match_type === 'title_similarity' ? 'medium' : 'high';

    // Confidence scoring
    let confidence = 100;
    if (!ytData) confidence -= 40;
    if (exclusionHits.length > 0) confidence -= exclusionHits.length * 25;
    if (duplicateRisk === 'high') confidence -= 60;
    if (duplicateRisk === 'medium') confidence -= 20;
    if (subs < 1000) confidence -= 10;
    confidence = Math.max(0, Math.min(100, confidence));

    const evidence = {
      channel_exists: !!ytData,
      title, description: description.slice(0, 500),
      subscriber_count: subs,
      latest_video_titles: latestTitles,
      exclusion_hits: exclusionHits,
      duplicate_match: dup ?? null,
      thumbnail: ytData?.snippet?.thumbnails?.default?.url ?? null,
      checked_at: new Date().toISOString(),
    };

    const autoApprove = confidence >= 95 && duplicateRisk === 'low' && exclusionHits.length === 0 && !!ytData;
    const status = autoApprove ? 'approved' : confidence < 50 || duplicateRisk === 'high' ? 'rejected' : 'pending';

    // Upsert candidate
    const { data: candidate, error: candErr } = await admin
      .from('channel_candidates')
      .upsert({
        youtube_channel_id, handle, title, description, category,
        subscriber_count: subs, source: source ?? 'manual',
        submitted_by: user.id, status, confidence,
        duplicate_risk: duplicateRisk, evidence,
      }, { onConflict: 'youtube_channel_id' })
      .select().single();
    if (candErr) throw candErr;

    // If auto-approved, insert into approved_channels
    if (status === 'approved') {
      const ownerKeySource = handle ?? title;
      const { data: ownerKeyRow } = await admin.rpc('compute_owner_key', { _name: ownerKeySource });
      await admin.from('approved_channels').upsert({
        youtube_channel_id, title, handle, category,
        owner_key: ownerKeyRow ?? '',
        approved_by: user.id,
        last_rechecked_at: new Date().toISOString(),
        consistency_score: confidence,
      }, { onConflict: 'youtube_channel_id' });
    }

    // Audit
    await admin.from('channel_audit_log').insert({
      candidate_id: candidate.id,
      youtube_channel_id, action: status === 'pending' ? 'flagged' : status,
      admin_id: user.id, confidence, duplicate_risk: duplicateRisk,
      evidence, reason: status === 'rejected'
        ? `Auto-rejected: ${exclusionHits.length ? 'exclusion hits' : duplicateRisk === 'high' ? 'duplicate' : 'low confidence'}`
        : status === 'approved' ? 'Auto-approved' : 'Requires manual review',
    });

    return new Response(JSON.stringify({ candidate, status, confidence, evidence }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('verify-channel error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
