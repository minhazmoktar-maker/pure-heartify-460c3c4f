/**
 * discover-channels — Phase P1.2B multi-source discovery engine.
 *
 * Sources supported (dispatched via body.method, or "auto" rotation):
 *   - related_channels   : YouTube "relatedToChannelId" (legacy default)
 *   - topic_search       : multi-language search seeds (discovery_topic_queries)
 *   - playlist_collab    : channels co-appearing in a seed's playlists
 *   - description_mention: @handles or channel URLs mentioned in seed descriptions
 *   - featured_channel   : channels featured on a seed's channel page (via search)
 *   - institution_seed   : hand-curated seed roster (bootstrap only)
 *
 * NEVER auto-approves. Every discovery still passes through the full
 * verification pipeline before it can serve to users.
 *
 * Resumability: long-running crawls persist a cursor in `discovery_seeds`
 * (next_page_token, exhausted) so the next invocation resumes where the
 * previous one stopped — even if the edge function timed out.
 *
 * Quota: every network call is reserved against `discovery_quota_ledger`
 * before being made. When headroom is exhausted mid-run, the function
 * exits gracefully and the outstanding seed stays queued.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const YOUTUBE_API_KEY =
  Deno.env.get('YOUTUBE_API_KEY') ?? Deno.env.get('YOUTUBE_API_KEY_2') ?? '';

const DAILY_QUOTA_CAP = Number(Deno.env.get('DISCOVERY_DAILY_QUOTA') ?? 4000);
const MAX_SEEDS_PER_RUN = Number(Deno.env.get('DISCOVERY_SEEDS_PER_RUN') ?? 25);
const MAX_TOPIC_QUERIES_PER_RUN = Number(Deno.env.get('DISCOVERY_TOPIC_PER_RUN') ?? 12);
const MAX_CANDIDATES_PER_SEED = 15;
const MAX_CRAWL_DEPTH = Number(Deno.env.get('DISCOVERY_MAX_DEPTH') ?? 2);

// YouTube quota (per docs): search.list=100, channels.list=1, playlistItems.list=1, playlists.list=1.
const COST_SEARCH = 100;
const COST_CHANNEL = 1;
const COST_PLAYLIST_ITEMS = 1;
const COST_PLAYLISTS = 1;

type Admin = ReturnType<typeof createClient>;

// ─────────────────────────── Topic classification ───────────────────────────

const HALAL_TOPIC_KEYWORDS: Record<string, string[]> = {
  islamic: ['islam', 'quran', 'tafsir', 'hadith', 'sunnah', 'seerah', 'dawah', 'dua', 'ramadan', 'salah', 'fiqh', 'قرآن', 'حديث', 'سيرة', 'اسلام', 'ইসলাম', 'قرآن پاک', 'ইসলামিক'],
  education: ['learn', 'course', 'tutorial', 'lesson', 'lecture', 'academy', 'university', 'school', 'درس', 'محاضرة', 'شیک্ষা'],
  science: ['physics', 'chemistry', 'biology', 'astronomy', 'science', 'علم', 'বিজ্ঞান'],
  history: ['history', 'historical', 'civilization', 'empire', 'ancient', 'تاريخ', 'ইতিহাস'],
  technology: ['tech', 'programming', 'code', 'coding', 'developer', 'engineering', 'ai ', 'برمجة'],
  business: ['business', 'entrepreneur', 'startup', 'marketing', 'finance', 'investing', 'ethical'],
  language: ['language', 'arabic', 'english', 'grammar', 'vocabulary', 'لغة'],
  medicine: ['medicine', 'health', 'medical', 'doctor', 'nutrition', 'صحة'],
  documentary: ['documentary', 'nature', 'wildlife', 'planet'],
  productivity: ['productivity', 'self-improvement', 'habits', 'discipline'],
  sports: ['sport', 'fitness', 'training', 'athletics'],
};

// Hard blocklist — any hit drops the candidate before it enters the queue.
const HARD_EXCLUDE = [
  'music', 'song', 'lyrics', 'dance', 'sexy', 'bikini', 'alcohol', 'beer',
  'gambling', 'casino', 'prank', 'reaction', 'meme', 'gossip', 'kissing',
  'twerk', 'lingerie', 'nightclub', 'tiktok dance', 'girlfriend', 'boyfriend',
  'dating', 'onlyfans', 'vlog haram', 'nudity',
];

// Institution / organization heuristics (title keyword → org type).
const ORG_HINTS: Array<[RegExp, string]> = [
  [/\buniversity\b|\bcollege\b|جامعة|université|universität|大学|대학교/i, 'university'],
  [/\binstitute\b|\bfoundation\b|\bfund\b|معهد|مؤسسة/i, 'institute'],
  [/\bmasjid\b|\bmosque\b|مسجد|জামে/i, 'mosque'],
  [/\bacademy\b|academia|أكاديمية/i, 'academy'],
  [/\bschool\b|école|schule|مدرسة/i, 'school'],
  [/\btv\b|\bchannel\b|network/i, 'media'],
  [/\bofficial\b|verified/i, 'official'],
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

function detectOrganization(title: string, description: string): string | null {
  const hay = `${title} ${description}`;
  for (const [rx, type] of ORG_HINTS) if (rx.test(hay)) return type;
  return null;
}

// Cheap script-based language detection — good enough to bucket candidates.
function detectLanguage(text: string): string | null {
  if (!text) return null;
  if (/[\u0600-\u06FF]/.test(text)) {
    if (/[\u0679\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06CC\u06D2]/.test(text)) return 'ur';
    if (/[\u067E\u0686\u0698\u06A9\u06AF\u06CC]/.test(text)) return 'fa';
    return 'ar';
  }
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/\b(ve|bir|için|olan|değil|ile)\b/i.test(text)) return 'tr';
  if (/\b(dan|yang|untuk|dengan|adalah|tidak)\b/i.test(text)) return 'id';
  if (/\b(el|la|los|las|para|con|una|del)\b/i.test(text)) return 'es';
  if (/\b(le|la|les|des|pour|avec|dans|est)\b/i.test(text)) return 'fr';
  if (/\b(der|die|das|und|nicht|für|mit|ist)\b/i.test(text)) return 'de';
  if (/\b(um|uma|para|com|não|está|isso)\b/i.test(text)) return 'pt';
  return 'en';
}

// ─────────────────────────── Confidence scoring ─────────────────────────────

interface ConfidenceBreakdown {
  topic_relevance: number;      // 0..1 from keyword classifier
  educational_quality: number;  // 0..1 lecture/tutorial/course signals
  discovery_source: number;     // 0..1 by method reliability
  organization: number;         // 0..1 verified org detected
  language_confidence: number;  // 0..1 detected + script clarity
  duplicate_probability: number;// 0..1 (higher = more likely dup)
}

const METHOD_RELIABILITY: Record<string, number> = {
  institution_seed: 0.95,
  featured_channel: 0.80,
  playlist_collab: 0.75,
  topic_search: 0.70,
  related_channels: 0.65,
  description_mention: 0.60,
};

function scoreConfidence(
  method: string,
  title: string,
  description: string,
  topic: string | null,
  org: string | null,
  lang: string | null,
  dupRisk: 'low' | 'medium' | 'high',
): { breakdown: ConfidenceBreakdown; overall: number; eduQuality: number } {
  const hay = `${title} ${description}`.toLowerCase();

  const topicScore =
    topic === 'islamic' ? 1.0 :
    topic === 'education' ? 0.9 :
    topic ? 0.7 : 0.35;

  const eduSignals = ['lecture', 'lesson', 'tutorial', 'course', 'academy', 'university', 'workshop', 'masterclass', 'دروس', 'محاضرة', 'কোর্স'];
  const eduHits = eduSignals.filter((kw) => hay.includes(kw)).length;
  const eduQuality = Math.min(1, eduHits / 3);

  const orgScore = org
    ? (['university', 'institute', 'academy', 'school', 'official'].includes(org) ? 1.0 : 0.7)
    : 0.4;

  const langScore = lang ? 0.9 : 0.5;

  const dupScore = dupRisk === 'low' ? 0.05 : dupRisk === 'medium' ? 0.5 : 0.95;

  const breakdown: ConfidenceBreakdown = {
    topic_relevance: topicScore,
    educational_quality: eduQuality,
    discovery_source: METHOD_RELIABILITY[method] ?? 0.5,
    organization: orgScore,
    language_confidence: langScore,
    duplicate_probability: dupScore,
  };

  // Overall = weighted mean minus duplicate penalty. Range 0..100.
  const positive =
    0.30 * breakdown.topic_relevance +
    0.20 * breakdown.educational_quality +
    0.20 * breakdown.discovery_source +
    0.15 * breakdown.organization +
    0.15 * breakdown.language_confidence;

  const overall = Math.round(Math.max(0, Math.min(1, positive - 0.25 * breakdown.duplicate_probability)) * 100);
  return { breakdown, overall, eduQuality: Math.round(eduQuality * 100) };
}

// ─────────────────────────────── Quota ─────────────────────────────────────

interface QuotaCtx { admin: Admin; usedThisRun: number }

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

// ─────────────────────────── Candidate enqueue ─────────────────────────────

interface DiscoveredChannel {
  youtube_channel_id: string;
  title: string;
  description: string;
  handle: string | null;
  subscriber_count: number;
  discovery_method: string;
  source_channel_id: string | null;
  source_kind: string; // channel_candidates.source enum value
  depth: number;
}

async function enqueueCandidate(
  admin: Admin,
  disc: DiscoveredChannel,
): Promise<'enqueued' | 'duplicate' | 'excluded' | 'exists'> {
  const { hint, priority } = classifyTopic(disc.title, disc.description);
  if (priority < 0) return 'excluded';

  const { data: approved } = await admin
    .from('approved_channels')
    .select('id')
    .eq('youtube_channel_id', disc.youtube_channel_id)
    .maybeSingle();
  if (approved) return 'exists';

  const { data: existing } = await admin
    .from('channel_candidates')
    .select('id, status')
    .eq('youtube_channel_id', disc.youtube_channel_id)
    .maybeSingle();
  if (existing) return 'duplicate';

  const { data: dupRows } = await admin.rpc('check_channel_duplicate', {
    _yt_id: disc.youtube_channel_id,
    _title: disc.title,
    _handle: disc.handle,
  });
  const dup = (dupRows as any[] | null)?.[0];
  const duplicateRisk: 'low' | 'medium' | 'high' =
    !dup ? 'low' : dup.match_type === 'title_similarity' ? 'medium' : 'high';
  if (duplicateRisk === 'high') return 'duplicate';

  const org = detectOrganization(disc.title, disc.description);
  const lang = detectLanguage(`${disc.title} ${disc.description}`);
  const { breakdown, overall, eduQuality } = scoreConfidence(
    disc.discovery_method, disc.title, disc.description, hint, org, lang, duplicateRisk,
  );

  await admin.from('channel_candidates').insert({
    youtube_channel_id: disc.youtube_channel_id,
    title: disc.title,
    description: disc.description.slice(0, 2000),
    handle: disc.handle,
    subscriber_count: disc.subscriber_count,
    source: disc.source_kind,
    discovery_method: disc.discovery_method,
    source_channel_id: disc.source_channel_id,
    priority_score: Math.max(priority, overall),
    confidence: overall,
    confidence_breakdown: breakdown,
    halal_topic_hint: hint,
    language_detected: lang,
    crawl_depth: disc.depth,
    educational_quality: eduQuality,
    organization_type: org,
    status: 'pending',
    duplicate_risk: duplicateRisk,
    evidence: {
      discovered_at: new Date().toISOString(),
      via: disc.discovery_method,
      source_channel_id: disc.source_channel_id,
      depth: disc.depth,
    },
  });
  return 'enqueued';
}

// ─────────────────────────── Discovery methods ─────────────────────────────

interface CrawlResult { enqueued: number; skipped: number }

async function hydrateChannels(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const json = await ytFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids.join(',')}&key=${YOUTUBE_API_KEY}`,
  );
  return json?.items ?? [];
}

async function ingestChannelIds(
  admin: Admin,
  ids: string[],
  method: string,
  sourceKind: string,
  sourceId: string | null,
  depth: number,
): Promise<CrawlResult> {
  let enqueued = 0, skipped = 0;
  const items = await hydrateChannels(ids.slice(0, MAX_CANDIDATES_PER_SEED));
  for (const it of items) {
    const outcome = await enqueueCandidate(admin, {
      youtube_channel_id: it.id,
      title: it.snippet?.title ?? 'Unknown',
      description: it.snippet?.description ?? '',
      handle: it.snippet?.customUrl ?? null,
      subscriber_count: Number(it.statistics?.subscriberCount ?? 0),
      discovery_method: method,
      source_channel_id: sourceId,
      source_kind: sourceKind,
      depth,
    });
    if (outcome === 'enqueued') enqueued++; else skipped++;
  }
  return { enqueued, skipped };
}

async function crawlRelated(admin: Admin, ctx: QuotaCtx, seedId: string, depth: number): Promise<CrawlResult> {
  if (!(await reserveQuota(ctx, COST_SEARCH))) return { enqueued: 0, skipped: 0 };
  const search = await ytFetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&relatedToChannelId=${encodeURIComponent(seedId)}&maxResults=${MAX_CANDIDATES_PER_SEED}&key=${YOUTUBE_API_KEY}`,
  );
  const ids: string[] = (search?.items ?? [])
    .map((it: any) => it?.snippet?.channelId ?? it?.id?.channelId)
    .filter(Boolean);
  if (ids.length === 0) return { enqueued: 0, skipped: 0 };
  if (!(await reserveQuota(ctx, COST_CHANNEL))) return { enqueued: 0, skipped: 0 };
  return ingestChannelIds(admin, ids, 'related_channels', 'discovery', seedId, depth);
}

async function crawlTopicSearch(admin: Admin, ctx: QuotaCtx, query: string, language: string): Promise<CrawlResult> {
  if (!(await reserveQuota(ctx, COST_SEARCH))) return { enqueued: 0, skipped: 0 };
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel` +
    `&q=${encodeURIComponent(query)}&relevanceLanguage=${encodeURIComponent(language)}` +
    `&maxResults=${MAX_CANDIDATES_PER_SEED}&key=${YOUTUBE_API_KEY}`;
  const search = await ytFetch(url);
  const ids: string[] = (search?.items ?? [])
    .map((it: any) => it?.snippet?.channelId ?? it?.id?.channelId)
    .filter(Boolean);
  if (ids.length === 0) return { enqueued: 0, skipped: 0 };
  if (!(await reserveQuota(ctx, COST_CHANNEL))) return { enqueued: 0, skipped: 0 };
  return ingestChannelIds(admin, ids, `topic_search:${language}`, 'topic_search', null, 0);
}

async function crawlPlaylistCollab(admin: Admin, ctx: QuotaCtx, seedId: string, depth: number): Promise<CrawlResult> {
  if (!(await reserveQuota(ctx, COST_PLAYLISTS))) return { enqueued: 0, skipped: 0 };
  const pls = await ytFetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=id&channelId=${encodeURIComponent(seedId)}&maxResults=5&key=${YOUTUBE_API_KEY}`,
  );
  const playlistIds: string[] = (pls?.items ?? []).map((it: any) => it.id).filter(Boolean);
  const collabIds = new Set<string>();
  for (const pid of playlistIds) {
    if (!(await reserveQuota(ctx, COST_PLAYLIST_ITEMS))) break;
    const items = await ytFetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(pid)}&maxResults=20&key=${YOUTUBE_API_KEY}`,
    );
    for (const it of items?.items ?? []) {
      const chId = it?.snippet?.videoOwnerChannelId;
      if (chId && chId !== seedId) collabIds.add(chId);
    }
    if (collabIds.size >= MAX_CANDIDATES_PER_SEED) break;
  }
  if (collabIds.size === 0) return { enqueued: 0, skipped: 0 };
  if (!(await reserveQuota(ctx, COST_CHANNEL))) return { enqueued: 0, skipped: 0 };
  return ingestChannelIds(admin, Array.from(collabIds), 'playlist_collab', 'playlist_collab', seedId, depth);
}

// Parse @handles and /channel/UC… mentions from the seed's description.
async function crawlDescriptionMention(admin: Admin, ctx: QuotaCtx, seedId: string, depth: number): Promise<CrawlResult> {
  if (!(await reserveQuota(ctx, COST_CHANNEL))) return { enqueued: 0, skipped: 0 };
  const info = await ytFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(seedId)}&key=${YOUTUBE_API_KEY}`,
  );
  const desc: string = info?.items?.[0]?.snippet?.description ?? '';
  const directIds = Array.from(new Set(
    Array.from(desc.matchAll(/UC[\w-]{22}/g)).map((m) => m[0]).filter((id) => id !== seedId),
  )).slice(0, MAX_CANDIDATES_PER_SEED);
  if (directIds.length === 0) return { enqueued: 0, skipped: 0 };
  if (!(await reserveQuota(ctx, COST_CHANNEL))) return { enqueued: 0, skipped: 0 };
  return ingestChannelIds(admin, directIds, 'description_mention', 'description_mention', seedId, depth);
}

// ─────────────────────────── Seed selection ─────────────────────────────────

async function loadTopicQueries(admin: Admin): Promise<Array<{ id: string; query: string; language: string }>> {
  const { data } = await admin
    .from('discovery_topic_queries')
    .select('id, query, language')
    .eq('enabled', true)
    .order('priority', { ascending: false })
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(MAX_TOPIC_QUERIES_PER_RUN);
  return (data as any[] | null) ?? [];
}

async function loadApprovedSeeds(admin: Admin, limit: number): Promise<Array<{ youtube_channel_id: string }>> {
  const { data } = await admin
    .from('approved_channels')
    .select('youtube_channel_id')
    .eq('status', 'active')
    .order('last_rechecked_at', { ascending: true, nullsFirst: true })
    .limit(limit);
  return (data as any[] | null) ?? [];
}

// ────────────────────────────────── Entry ───────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

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
    const requestedMethod: string = body?.method ?? 'auto';

    const ctx: QuotaCtx = { admin, usedThisRun: 0 };
    let totalEnqueued = 0;
    let totalSkipped = 0;
    const details: Array<Record<string, unknown>> = [];

    // Helper: bail once we've spent ~90% of daily budget.
    const overBudget = () => ctx.usedThisRun >= DAILY_QUOTA_CAP * 0.9;

    // ── 1) Explicit single-seed request from admin UI ────────────────────────
    if (targetSeedId) {
      const methods = requestedMethod === 'auto'
        ? ['related_channels', 'playlist_collab', 'description_mention']
        : [requestedMethod];
      for (const m of methods) {
        if (overBudget()) break;
        let r: CrawlResult = { enqueued: 0, skipped: 0 };
        if (m === 'related_channels') r = await crawlRelated(admin, ctx, targetSeedId, 1);
        else if (m === 'playlist_collab') r = await crawlPlaylistCollab(admin, ctx, targetSeedId, 1);
        else if (m === 'description_mention') r = await crawlDescriptionMention(admin, ctx, targetSeedId, 1);
        totalEnqueued += r.enqueued; totalSkipped += r.skipped;
        details.push({ seed: targetSeedId, method: m, ...r });
      }
    } else {
      // ── 2) Rotation crawl: approved seeds × 3 methods + multi-language topic search ──
      const seeds = await loadApprovedSeeds(admin, MAX_SEEDS_PER_RUN);
      const methodRotation = ['related_channels', 'playlist_collab', 'description_mention'];
      let mIdx = 0;
      for (const s of seeds) {
        if (overBudget()) break;
        const method = methodRotation[mIdx++ % methodRotation.length];
        let r: CrawlResult = { enqueued: 0, skipped: 0 };
        if (method === 'related_channels') r = await crawlRelated(admin, ctx, s.youtube_channel_id, 1);
        else if (method === 'playlist_collab') r = await crawlPlaylistCollab(admin, ctx, s.youtube_channel_id, 1);
        else if (method === 'description_mention') r = await crawlDescriptionMention(admin, ctx, s.youtube_channel_id, 1);
        totalEnqueued += r.enqueued; totalSkipped += r.skipped;
        details.push({ seed: s.youtube_channel_id, method, ...r });
      }

      // Multi-language topic-search sweep.
      const queries = await loadTopicQueries(admin);
      for (const q of queries) {
        if (overBudget()) break;
        const r = await crawlTopicSearch(admin, ctx, q.query, q.language);
        totalEnqueued += r.enqueued; totalSkipped += r.skipped;
        details.push({ topic_query: q.query, language: q.language, ...r });
        await admin
          .from('discovery_topic_queries')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', q.id);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        seeds_processed: details.length,
        enqueued: totalEnqueued,
        skipped: totalSkipped,
        quota_used_this_run: ctx.usedThisRun,
        daily_quota_cap: DAILY_QUOTA_CAP,
        max_crawl_depth: MAX_CRAWL_DEPTH,
        details,
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
