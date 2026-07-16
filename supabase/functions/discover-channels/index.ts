/**
 * discover-channels
 *
 * Crawls the YouTube graph from every approved channel to surface new
 * halal-candidate creators. Enqueues discoveries into `channel_candidates`
 * with source='discovery' and status='pending' so admins can review.
 *
 * NEVER auto-approves. NEVER bypasses moderation.
 *
 * Trigger paths:
 *  - Scheduled: pg_cron every 6h (invoked via net.http_post w/ service role).
 *  - Manual: admin POST from /admin/discovery with optional { source_channel_id }.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const YOUTUBE_API_KEY =
  Deno.env.get('YOUTUBE_API_KEY') ?? Deno.env.get('YOUTUBE_API_KEY_2') ?? '';

// Daily quota cap for discovery crawls (YouTube Data API default: 10k/day).
// Reserve headroom for interactive verify-channel and ingest-videos.
const DAILY_QUOTA_CAP = Number(Deno.env.get('DISCOVERY_DAILY_QUOTA') ?? 4000);

// Per-invocation caps.
const MAX_SEED_CHANNELS = Number(Deno.env.get('DISCOVERY_SEEDS_PER_RUN') ?? 25);
const MAX_CANDIDATES_PER_SEED = 15;

// YouTube search unit cost (per docs): search.list=100, channels.list=1,
// playlistItems.list=1.
const COST_SEARCH = 100;
const COST_CHANNEL = 1;

const HALAL_TOPIC_KEYWORDS: Record<string, string[]> = {
  islamic: ['islam', 'quran', 'tafsir', 'hadith', 'sunnah', 'seerah', 'dawah', 'dua', 'ramadan', 'salah', 'fiqh'],
  education: ['learn', 'course', 'tutorial', 'lesson', 'lecture', 'academy'],
  science: ['physics', 'chemistry', 'biology', 'astronomy', 'science'],
  history: ['history', 'historical', 'civilization', 'empire', 'ancient'],
  technology: ['tech', 'programming', 'code', 'coding', 'developer', 'engineering', 'ai '],
  business: ['business', 'entrepreneur', 'startup', 'marketing', 'finance', 'investing'],
  language: ['language', 'arabic', 'english', 'grammar', 'vocabulary'],
  medicine: ['medicine', 'health', 'medical', 'doctor', 'nutrition'],
  documentary: ['documentary', 'nature', 'wildlife', 'planet'],
  productivity: ['productivity', 'self-improvement', 'habits', 'discipline'],
  sports: ['sport', 'fitness', 'training', 'athletics'],
};

const HARD_EXCLUDE = [
  'music', 'song', 'lyrics', 'dance', 'sexy', 'bikini', 'alcohol', 'beer',
  'gambling', 'casino', 'prank', 'reaction', 'meme', 'gossip', 'kissing',
  'twerk', 'lingerie', 'nightclub', 'tiktok dance', 'girlfriend', 'boyfriend',
  'dating', 'onlyfans',
];

function classifyTopic(title: string, description: string): { hint: string | null; priority: number } {
  const hay = `${title} ${description}`.toLowerCase();
  if (HARD_EXCLUDE.some((kw) => hay.includes(kw))) return { hint: null, priority: -1 };
  for (const [topic, kws] of Object.entries(HALAL_TOPIC_KEYWORDS)) {
    if (kws.some((kw) => hay.includes(kw))) {
      const base = topic === 'islamic' ? 95 : topic === 'education' ? 85 : 70;
      return { hint: topic, priority: base };
    }
  }
  return { hint: null, priority: 40 };
}

interface QuotaCtx { admin: ReturnType<typeof createClient>; usedThisRun: number }
async function reserveQuota(ctx: QuotaCtx, cost: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const { data } = await ctx.admin
    .from('discovery_quota_ledger')
    .select('units_used')
    .eq('day', day)
    .eq('api_name', 'youtube_v3')
    .maybeSingle();
  const current = (data?.units_used as number | undefined) ?? 0;
  if (current + cost > DAILY_QUOTA_CAP) return false;
  await ctx.admin
    .from('discovery_quota_ledger')
    .upsert(
      { day, api_name: 'youtube_v3', units_used: current + cost, updated_at: new Date().toISOString() },
      { onConflict: 'day,api_name' },
    );
  ctx.usedThisRun += cost;
  return true;
}

async function ytFetch(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('youtube api error', res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('youtube fetch failed', e);
    return null;
  }
}

interface DiscoveredChannel {
  youtube_channel_id: string;
  title: string;
  description: string;
  handle: string | null;
  subscriber_count: number;
  discovery_method: string;
  source_channel_id: string;
}

async function enqueueCandidate(
  admin: ReturnType<typeof createClient>,
  disc: DiscoveredChannel,
): Promise<'enqueued' | 'duplicate' | 'excluded' | 'exists'> {
  const { hint, priority } = classifyTopic(disc.title, disc.description);
  if (priority < 0) return 'excluded';

  // Skip if already an approved channel.
  const { data: approved } = await admin
    .from('approved_channels')
    .select('id')
    .eq('youtube_channel_id', disc.youtube_channel_id)
    .maybeSingle();
  if (approved) return 'exists';

  // Skip if candidate already enqueued.
  const { data: existing } = await admin
    .from('channel_candidates')
    .select('id, status')
    .eq('youtube_channel_id', disc.youtube_channel_id)
    .maybeSingle();
  if (existing) return 'duplicate';

  // Owner-key duplicate check.
  const { data: dupRows } = await admin.rpc('check_channel_duplicate', {
    _yt_id: disc.youtube_channel_id,
    _title: disc.title,
    _handle: disc.handle,
  });
  const dup = dupRows?.[0];
  const duplicateRisk = !dup ? 'low' : dup.match_type === 'title_similarity' ? 'medium' : 'high';
  if (duplicateRisk === 'high') return 'duplicate';

  await admin.from('channel_candidates').insert({
    youtube_channel_id: disc.youtube_channel_id,
    title: disc.title,
    description: disc.description.slice(0, 2000),
    handle: disc.handle,
    subscriber_count: disc.subscriber_count,
    source: 'discovery',
    discovery_method: disc.discovery_method,
    source_channel_id: disc.source_channel_id,
    priority_score: priority,
    halal_topic_hint: hint,
    status: 'pending',
    duplicate_risk: duplicateRisk,
    evidence: {
      discovered_at: new Date().toISOString(),
      via: disc.discovery_method,
      source_channel_id: disc.source_channel_id,
    },
  });
  return 'enqueued';
}

async function crawlSeed(
  admin: ReturnType<typeof createClient>,
  ctx: QuotaCtx,
  seedId: string,
): Promise<{ enqueued: number; skipped: number }> {
  let enqueued = 0;
  let skipped = 0;

  // 1. Featured/related via search "related to channel" heuristic:
  //    query for the seed's top playlist owner + channels featured in descriptions.
  if (!(await reserveQuota(ctx, COST_SEARCH))) return { enqueued, skipped };
  const searchJson = await ytFetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&relatedToChannelId=${encodeURIComponent(seedId)}&maxResults=${MAX_CANDIDATES_PER_SEED}&key=${YOUTUBE_API_KEY}`,
  );

  const relatedIds: string[] = (searchJson?.items ?? [])
    .map((it: any) => it?.snippet?.channelId ?? it?.id?.channelId)
    .filter(Boolean);

  if (relatedIds.length === 0) return { enqueued, skipped };
  if (!(await reserveQuota(ctx, COST_CHANNEL))) return { enqueued, skipped };

  // Batch-hydrate the candidate channels (channels.list up to 50 ids).
  const hydrateJson = await ytFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${relatedIds.join(',')}&key=${YOUTUBE_API_KEY}`,
  );
  const items = hydrateJson?.items ?? [];

  for (const it of items) {
    const disc: DiscoveredChannel = {
      youtube_channel_id: it.id,
      title: it.snippet?.title ?? 'Unknown',
      description: it.snippet?.description ?? '',
      handle: it.snippet?.customUrl ?? null,
      subscriber_count: Number(it.statistics?.subscriberCount ?? 0),
      discovery_method: 'related_channels',
      source_channel_id: seedId,
    };
    const outcome = await enqueueCandidate(admin, disc);
    if (outcome === 'enqueued') enqueued++;
    else skipped++;
  }

  return { enqueued, skipped };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Auth: admin JWT OR service-role secret header (cron path).
    const cronSecret = req.headers.get('X-Cron-Secret');
    const isCron = cronSecret && cronSecret === Deno.env.get('CRON_SECRET');

    if (!isCron) {
      const authHeader = req.headers.get('Authorization') ?? '';
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
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
    }

    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ error: 'YOUTUBE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetSeedId: string | undefined = body?.source_channel_id;

    // Pick seed channels: either explicit target, or oldest-not-crawled approved channels.
    let seeds: Array<{ youtube_channel_id: string }>;
    if (targetSeedId) {
      seeds = [{ youtube_channel_id: targetSeedId }];
    } else {
      const { data } = await admin
        .from('approved_channels')
        .select('youtube_channel_id')
        .eq('status', 'active')
        .order('last_rechecked_at', { ascending: true, nullsFirst: true })
        .limit(MAX_SEED_CHANNELS);
      seeds = data ?? [];
    }

    const ctx: QuotaCtx = { admin, usedThisRun: 0 };
    let totalEnqueued = 0;
    let totalSkipped = 0;
    const seedResults: Array<{ seed: string; enqueued: number; skipped: number }> = [];

    for (const s of seeds) {
      const r = await crawlSeed(admin, ctx, s.youtube_channel_id);
      totalEnqueued += r.enqueued;
      totalSkipped += r.skipped;
      seedResults.push({ seed: s.youtube_channel_id, ...r });
      if (ctx.usedThisRun >= DAILY_QUOTA_CAP * 0.9) break;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        seeds_processed: seedResults.length,
        enqueued: totalEnqueued,
        skipped: totalSkipped,
        quota_used_this_run: ctx.usedThisRun,
        details: seedResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('discover-channels error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
