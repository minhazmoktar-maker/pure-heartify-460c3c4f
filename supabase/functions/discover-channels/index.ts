/**
 * discover-channels — Phase P1.2C production-hardened discovery engine.
 *
 * Changes vs P1.2B:
 *  - Removed deprecated `related_channels` (YouTube retired relatedToChannelId).
 *  - Background execution via EdgeRuntime.waitUntil — returns HTTP 202 immediately.
 *  - Job tracking in public.discovery_jobs with heartbeat + cancel + stats.
 *  - Batched channels.list (up to 50 IDs per call) — up to 50× cheaper than per-ID.
 *  - Batched duplicate lookup via check_channel_duplicates_batch RPC.
 *  - Batched INSERT of candidates (single round trip per source).
 *  - Multilingual language detector with confidence scoring.
 *  - Expanded multilingual organization detector.
 *  - Time-budgeted execution (soft deadline < edge idle limit).
 *  - Never auto-approves. All candidates still enter the full moderation pipeline.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// All configured keys, in rotation order. Discovery previously used a single
// key, so one `quotaExceeded` killed every call for the rest of the day.
const YOUTUBE_API_KEYS: string[] = [
  Deno.env.get('YOUTUBE_API_KEY'),
  Deno.env.get('YOUTUBE_API_KEY_2'),
].filter((k): k is string => !!k && k.length > 0);
// Kept for URL construction; ytFetch swaps in whichever key is still live.
const YOUTUBE_API_KEY = YOUTUBE_API_KEYS[0] ?? '';

const DAILY_QUOTA_CAP = Number(Deno.env.get('DISCOVERY_DAILY_QUOTA') ?? 4000);
const MAX_SEEDS_PER_RUN = Number(Deno.env.get('DISCOVERY_SEEDS_PER_RUN') ?? 40);
const MAX_TOPIC_QUERIES_PER_RUN = Number(Deno.env.get('DISCOVERY_TOPIC_PER_RUN') ?? 16);
const MAX_CANDIDATES_PER_SEED = 20;
const BUDGET_STOP_RATIO = 0.9;             // stop when we've spent 90% of daily cap
const SOFT_DEADLINE_MS = 5 * 60_000;       // 5 min soft deadline for background job
const CHANNELS_BATCH = 50;                 // YouTube channels.list max ids per call

// YouTube quota costs
const COST_SEARCH = 100;
const COST_CHANNEL_BATCH = 1;              // channels.list is 1 unit regardless of ids
const COST_PLAYLIST_ITEMS = 1;
const COST_PLAYLISTS = 1;

type Admin = ReturnType<typeof createClient>;

// ─────────────────────────── Topic classification ───────────────────────────

const HALAL_TOPIC_KEYWORDS: Record<string, string[]> = {
  islamic: ['islam', 'quran', 'tafsir', 'hadith', 'sunnah', 'seerah', 'dawah', 'dua', 'ramadan', 'salah', 'fiqh', 'قرآن', 'حديث', 'سيرة', 'اسلام', 'ইসলাম', 'قرآن پاک', 'ইসলামিক', 'مسلم', 'اسلامی'],
  education: ['learn', 'course', 'tutorial', 'lesson', 'lecture', 'academy', 'university', 'school', 'درس', 'محاضرة', 'تعليم', 'শিক্ষা', 'পাঠ', 'تعلیم', 'sekolah', 'kuliah'],
  science: ['physics', 'chemistry', 'biology', 'astronomy', 'science', 'علم', 'বিজ্ঞান', 'ilmu', 'ilim', 'ciencia', 'ciência', 'wissenschaft', '科学', '科學', '과학'],
  history: ['history', 'historical', 'civilization', 'empire', 'ancient', 'تاريخ', 'ইতিহাস', 'sejarah', 'tarih', 'historia', 'geschichte', '歴史', '历史', '역사'],
  technology: ['tech', 'programming', 'code', 'coding', 'developer', 'engineering', 'ai ', 'برمجة', 'teknologi', 'teknoloji'],
  business: ['business', 'entrepreneur', 'startup', 'marketing', 'finance', 'investing', 'ethical', 'halal finance', 'islamic finance'],
  language: ['language', 'arabic', 'grammar', 'vocabulary', 'لغة', 'nahw', 'sarf'],
  medicine: ['medicine', 'health', 'medical', 'doctor', 'nutrition', 'صحة', 'kesehatan', 'sağlık', 'saúde'],
  documentary: ['documentary', 'nature', 'wildlife', 'planet', 'documental', 'dokumentation'],
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

// Multilingual organization detector.
const ORG_HINTS: Array<[RegExp, string]> = [
  // Universities
  [/\buniversit(y|é|ät|à|e)\b|جامعة|دانشگاه|বিশ্ববিদ্যালয়|大学|대학교|üniversite|universidad|universidade|universiteit/i, 'university'],
  // Institutes / research
  [/\binstitut(e|o|s)?\b|معهد|মহাবিদ্যালয়|研究所|연구소|instituto|institut/i, 'institute'],
  // Foundations / charities
  [/\bfoundation\b|مؤسسة|بنیاد|ফাউন্ডেশন|재단|fundação|fundación|stiftung/i, 'foundation'],
  // Mosques
  [/\bmasjid\b|\bmosque\b|مسجد|مسـجد|مسجدی|জামে|masjid/i, 'mosque'],
  // Academies
  [/\bacademy\b|academia|أكاديمية|akademi|akademie/i, 'academy'],
  // Schools
  [/\bschool\b|école|schule|مدرسة|مدرسه|মাদ্রাসা|madrasah|escuela|escola/i, 'school'],
  // Ministries / official
  [/\bministry\b|وزارة|kementerian|ministério|ministerio|ministerium|departamento|departmento/i, 'ministry'],
  [/\bofficial\b|verified|قناة رسمية|رسمی|resmi|oficial|offiziell/i, 'official'],
  // Media / TV
  [/\btv\b|\bchannel\b|network|قناة|チャンネル|채널|canal|kanal/i, 'media'],
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

// ─────────────────────────── Language detection ─────────────────────────────

// Script-based detection first (highest confidence), then keyword dictionaries.
const LANG_KEYWORDS: Record<string, RegExp> = {
  tr: /\b(ve|bir|için|olan|değil|ile|çok|kadar|nasıl|neden)\b/i,
  id: /\b(dan|yang|untuk|dengan|adalah|tidak|kita|saya|bagaimana)\b/i,
  ms: /\b(dan|yang|untuk|dengan|adalah|tidak|kita|saya|bagaimana|sahaja|kami)\b/i,
  es: /\b(el|la|los|las|para|con|una|del|cómo|porque|también)\b/i,
  fr: /\b(le|la|les|des|pour|avec|dans|est|comment|pourquoi|également)\b/i,
  de: /\b(der|die|das|und|nicht|für|mit|ist|warum|wie|auch)\b/i,
  pt: /\b(um|uma|para|com|não|está|isso|porque|como|também)\b/i,
  sw: /\b(na|wa|kwa|hii|hiyo|kama|lakini|kwenye|kuhusu)\b/i,
};

interface LangResult { code: string | null; confidence: number }

function detectLanguageWithConfidence(text: string): LangResult {
  if (!text || text.trim().length < 3) return { code: null, confidence: 0 };
  const t = text.slice(0, 500);

  // Script-based (very high confidence)
  if (/[\u0600-\u06FF]/.test(t)) {
    // Urdu-specific letters
    if (/[\u0679\u067E\u0688\u0691\u0698\u06BA\u06BE\u06C1\u06CC\u06D2]/.test(t)) return { code: 'ur', confidence: 0.95 };
    // Persian-specific
    if (/[\u067E\u0686\u0698\u06A9\u06AF]/.test(t)) return { code: 'fa', confidence: 0.92 };
    return { code: 'ar', confidence: 0.95 };
  }
  if (/[\u0980-\u09FF]/.test(t)) return { code: 'bn', confidence: 0.95 };
  if (/[\u0900-\u097F]/.test(t)) return { code: 'hi', confidence: 0.95 };
  if (/[\u4E00-\u9FFF]/.test(t)) return { code: 'zh', confidence: 0.93 };
  if (/[\u3040-\u30FF]/.test(t)) return { code: 'ja', confidence: 0.95 };
  if (/[\uAC00-\uD7AF]/.test(t)) return { code: 'ko', confidence: 0.95 };

  // Latin-script keyword scoring
  const scores: Array<[string, number]> = [];
  for (const [lang, rx] of Object.entries(LANG_KEYWORDS)) {
    const matches = t.match(new RegExp(rx.source, 'gi'));
    if (matches) scores.push([lang, matches.length]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  if (scores.length > 0 && scores[0][1] >= 2) {
    const top = scores[0][1];
    const runner = scores[1]?.[1] ?? 0;
    const confidence = Math.min(0.85, 0.5 + (top - runner) * 0.1);
    return { code: scores[0][0], confidence };
  }

  // Fallback: assume English if latin and no signal.
  return { code: 'en', confidence: 0.35 };
}

// ─────────────────────────── Confidence scoring ─────────────────────────────

interface ConfidenceBreakdown {
  topic_relevance: number;
  educational_quality: number;
  discovery_source: number;
  organization: number;
  language_confidence: number;
  duplicate_probability: number;
}

const METHOD_RELIABILITY: Record<string, number> = {
  institution_seed: 0.95,
  featured_channel: 0.80,
  playlist_collab: 0.75,
  topic_search: 0.70,
  description_mention: 0.60,
};

function scoreConfidence(
  method: string,
  title: string,
  description: string,
  topic: string | null,
  org: string | null,
  langConf: number,
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
    ? (['university', 'institute', 'academy', 'school', 'official', 'ministry', 'foundation', 'mosque'].includes(org) ? 1.0 : 0.7)
    : 0.4;

  const dupScore = dupRisk === 'low' ? 0.05 : dupRisk === 'medium' ? 0.5 : 0.95;

  const breakdown: ConfidenceBreakdown = {
    topic_relevance: topicScore,
    educational_quality: eduQuality,
    discovery_source: METHOD_RELIABILITY[method] ?? 0.5,
    organization: orgScore,
    language_confidence: langConf,
    duplicate_probability: dupScore,
  };

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

interface QuotaCtx {
  admin: Admin;
  usedThisRun: number;
  apiFailures: number;
  /** Index into YOUTUBE_API_KEYS of the key currently believed to be live. */
  keyIndex: number;
  /** True once every configured key has answered quotaExceeded this run. */
  quotaExhausted: boolean;
}

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

const QUOTA_PATTERN =
  /quotaExceeded|dailyLimitExceeded|rateLimitExceeded|userRateLimitExceeded|exceeded your .*quota/i;

/** Swap the `key=` query param for the given key. */
function withKey(url: string, key: string): string {
  return url.replace(/([?&])key=[^&]*/, `$1key=${encodeURIComponent(key)}`);
}

/**
 * Fetch with exponential backoff on transient errors, multi-key rotation on
 * quota errors, and a hard run-level stop once every key is exhausted so the
 * job doesn't keep hammering a dead quota for the rest of its budget.
 */
async function ytFetch(ctx: QuotaCtx, url: string, attempts = 3): Promise<any | null> {
  if (ctx.quotaExhausted) return null;

  for (let i = 0; i < attempts; i++) {
    try {
      const key = YOUTUBE_API_KEYS[ctx.keyIndex] ?? YOUTUBE_API_KEY;
      const res = await fetch(withKey(url, key));
      if (res.ok) return await res.json();

      const body = (await res.text()).slice(0, 300);
      const isQuota =
        res.status === 429 || (res.status === 403 && QUOTA_PATTERN.test(body)) || QUOTA_PATTERN.test(body);

      if (isQuota) {
        // Rotate to the next configured key; if none remain, stop the run.
        if (ctx.keyIndex + 1 < YOUTUBE_API_KEYS.length) {
          ctx.keyIndex++;
          console.warn(
            `youtube quota exhausted on key #${ctx.keyIndex} — rotating to key #${ctx.keyIndex + 1}`,
          );
          continue; // retry same URL with the next key (does not consume `i` budget meaningfully)
        }
        ctx.quotaExhausted = true;
        ctx.apiFailures++;
        console.error(
          `youtube quota exhausted on all ${YOUTUBE_API_KEYS.length} key(s) — halting discovery run: ${body}`,
        );
        return null;
      }

      if (res.status === 403 || res.status === 400 || res.status === 404) {
        console.error('youtube api error', res.status, body);
        ctx.apiFailures++;
        return null;
      }
      // 5xx → backoff
      await new Promise((r) => setTimeout(r, 250 * Math.pow(2, i)));
    } catch (e) {
      console.error('youtube fetch failed', e);
      await new Promise((r) => setTimeout(r, 250 * Math.pow(2, i)));
    }
  }
  ctx.apiFailures++;
  return null;
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
  source_kind: string;
  depth: number;
}

/**
 * Batched candidate ingestion — one duplicate lookup + one insert per group.
 * Cuts round trips from 3N to ~2 per batch.
 */
async function ingestCandidatesBatch(
  admin: Admin,
  candidates: DiscoveredChannel[],
): Promise<{ enqueued: number; skipped: number }> {
  if (candidates.length === 0) return { enqueued: 0, skipped: 0 };

  // 1) Batch existence check
  const ids = Array.from(new Set(candidates.map((c) => c.youtube_channel_id)));
  const { data: existingRows } = await admin.rpc('check_channel_duplicates_batch', { _ids: ids });
  const existing = new Set<string>(
    ((existingRows as any[] | null) ?? []).map((r) => r.youtube_channel_id),
  );

  const rows: any[] = [];
  let skipped = 0;

  // 2) Score + dedupe within batch
  const seen = new Set<string>();
  for (const disc of candidates) {
    if (seen.has(disc.youtube_channel_id)) { skipped++; continue; }
    seen.add(disc.youtube_channel_id);

    if (existing.has(disc.youtube_channel_id)) { skipped++; continue; }

    const { hint, priority } = classifyTopic(disc.title, disc.description);
    if (priority < 0) { skipped++; continue; }

    const org = detectOrganization(disc.title, disc.description);
    const { code: lang, confidence: langConf } = detectLanguageWithConfidence(`${disc.title} ${disc.description}`);
    const duplicateRisk: 'low' | 'medium' | 'high' = 'low';
    const { breakdown, overall, eduQuality } = scoreConfidence(
      disc.discovery_method, disc.title, disc.description, hint, org, langConf, duplicateRisk,
    );

    rows.push({
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
        language_confidence: langConf,
      },
    });
  }

  if (rows.length === 0) return { enqueued: 0, skipped };

  // 3) Single batched INSERT with ON CONFLICT DO NOTHING semantics via upsert
  const { error } = await admin
    .from('channel_candidates')
    .upsert(rows, { onConflict: 'youtube_channel_id', ignoreDuplicates: true });
  if (error) {
    console.error('batch insert error', error.message);
    return { enqueued: 0, skipped: skipped + rows.length };
  }
  return { enqueued: rows.length, skipped };
}

// ─────────────────────────── Batched channel hydration ─────────────────────

async function hydrateChannelsBatched(
  ctx: QuotaCtx,
  ids: string[],
): Promise<any[]> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  const out: any[] = [];
  for (let i = 0; i < unique.length; i += CHANNELS_BATCH) {
    const chunk = unique.slice(i, i + CHANNELS_BATCH);
    if (!(await reserveQuota(ctx, COST_CHANNEL_BATCH))) break;
    const json = await ytFetch(
      ctx,
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`,
    );
    if (json?.items) out.push(...json.items);
  }
  return out;
}

function itemsToDiscovered(
  items: any[],
  method: string,
  sourceKind: string,
  sourceId: string | null,
  depth: number,
): DiscoveredChannel[] {
  return items.map((it) => ({
    youtube_channel_id: it.id,
    title: it.snippet?.title ?? 'Unknown',
    description: it.snippet?.description ?? '',
    handle: it.snippet?.customUrl ?? null,
    subscriber_count: Number(it.statistics?.subscriberCount ?? 0),
    discovery_method: method,
    source_channel_id: sourceId,
    source_kind: sourceKind,
    depth,
  }));
}

// ─────────────────────────── Discovery methods ─────────────────────────────

interface CrawlResult { enqueued: number; skipped: number; ids: number }

async function crawlTopicSearch(
  admin: Admin, ctx: QuotaCtx, query: string, language: string,
): Promise<CrawlResult> {
  if (!(await reserveQuota(ctx, COST_SEARCH))) return { enqueued: 0, skipped: 0, ids: 0 };
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel` +
    `&q=${encodeURIComponent(query)}&relevanceLanguage=${encodeURIComponent(language)}` +
    `&maxResults=${MAX_CANDIDATES_PER_SEED}&safeSearch=strict&key=${YOUTUBE_API_KEY}`;
  const search = await ytFetch(ctx, url);
  const ids: string[] = (search?.items ?? [])
    .map((it: any) => it?.snippet?.channelId ?? it?.id?.channelId)
    .filter(Boolean);
  if (ids.length === 0) return { enqueued: 0, skipped: 0, ids: 0 };
  const items = await hydrateChannelsBatched(ctx, ids);
  const r = await ingestCandidatesBatch(admin, itemsToDiscovered(items, `topic_search:${language}`, 'topic_search', null, 0));
  return { ...r, ids: ids.length };
}

async function crawlPlaylistCollab(
  admin: Admin, ctx: QuotaCtx, seedId: string, depth: number,
): Promise<CrawlResult> {
  if (!(await reserveQuota(ctx, COST_PLAYLISTS))) return { enqueued: 0, skipped: 0, ids: 0 };
  const pls = await ytFetch(
    ctx,
    `https://www.googleapis.com/youtube/v3/playlists?part=id&channelId=${encodeURIComponent(seedId)}&maxResults=5&key=${YOUTUBE_API_KEY}`,
  );
  const playlistIds: string[] = (pls?.items ?? []).map((it: any) => it.id).filter(Boolean);
  const collabIds = new Set<string>();
  for (const pid of playlistIds) {
    if (!(await reserveQuota(ctx, COST_PLAYLIST_ITEMS))) break;
    const items = await ytFetch(
      ctx,
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(pid)}&maxResults=20&key=${YOUTUBE_API_KEY}`,
    );
    for (const it of items?.items ?? []) {
      const chId = it?.snippet?.videoOwnerChannelId;
      if (chId && chId !== seedId) collabIds.add(chId);
    }
    if (collabIds.size >= MAX_CANDIDATES_PER_SEED) break;
  }
  if (collabIds.size === 0) return { enqueued: 0, skipped: 0, ids: 0 };
  const items = await hydrateChannelsBatched(ctx, Array.from(collabIds));
  const r = await ingestCandidatesBatch(admin, itemsToDiscovered(items, 'playlist_collab', 'playlist_collab', seedId, depth));
  return { ...r, ids: collabIds.size };
}

// Parse @handles and /channel/UC… mentions from the seed's description.
// Optimization: reuses hydrated seed metadata to avoid re-fetching.
async function crawlDescriptionMention(
  admin: Admin, ctx: QuotaCtx, seedDescription: string, seedId: string, depth: number,
): Promise<CrawlResult> {
  const directIds = Array.from(new Set(
    Array.from(seedDescription.matchAll(/UC[\w-]{22}/g)).map((m) => m[0]).filter((id) => id !== seedId),
  )).slice(0, MAX_CANDIDATES_PER_SEED);
  if (directIds.length === 0) return { enqueued: 0, skipped: 0, ids: 0 };
  const items = await hydrateChannelsBatched(ctx, directIds);
  const r = await ingestCandidatesBatch(admin, itemsToDiscovered(items, 'description_mention', 'description_mention', seedId, depth));
  return { ...r, ids: directIds.length };
}

// ─────────────────────────── Seed selection ─────────────────────────────────

async function loadTopicQueries(admin: Admin): Promise<Array<{ id: string; query: string; language: string }>> {
  // Language-equity scheduling: `next_topic_queries` round-robins across
  // languages and puts the neediest corpus (deficit × real audience demand)
  // first, so English/Arabic can no longer monopolise every run while a user
  // who picked Bengali/Malay/Hindi/Persian lands on a near-empty feed.
  const { data: fair, error } = await admin.rpc('next_topic_queries', {
    p_limit: MAX_TOPIC_QUERIES_PER_RUN,
    p_target: Number(Deno.env.get('DISCOVERY_LANG_TARGET') ?? 20000),
  });
  if (!error && Array.isArray(fair) && fair.length > 0) {
    return (fair as Array<{ id: string; query: string; language: string }>).map((r) => ({
      id: r.id, query: r.query, language: r.language,
    }));
  }
  // Fallback: legacy priority/staleness ordering if the RPC is unavailable.
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

interface AllocationRow { source: string; share_percent: number; enabled: boolean }

// P1.3: owner-editable quota allocations. Falls back to a safe default split
// so a missing/empty table never blocks discovery.
async function loadAllocations(admin: Admin): Promise<AllocationRow[]> {
  const { data } = await admin
    .from('discovery_quota_allocations')
    .select('source, share_percent, enabled');
  const rows = (data as AllocationRow[] | null) ?? [];
  if (rows.length === 0) {
    return [
      { source: 'topic_search', share_percent: 50, enabled: true },
      { source: 'playlist_collab', share_percent: 25, enabled: true },
      { source: 'description_mention', share_percent: 25, enabled: true },
    ];
  }
  return rows;
}

// ─────────────────────────── Job worker ─────────────────────────────────────

async function updateJob(admin: Admin, jobId: string, patch: Record<string, unknown>) {
  await admin.from('discovery_jobs').update({ ...patch, heartbeat_at: new Date().toISOString() }).eq('id', jobId);
}

async function isCancelled(admin: Admin, jobId: string): Promise<boolean> {
  const { data } = await admin.from('discovery_jobs').select('cancel_requested').eq('id', jobId).maybeSingle();
  return Boolean((data as any)?.cancel_requested);
}

interface JobParams { targetSeedId?: string; requestedMethod?: string }

async function runDiscoveryJob(admin: Admin, jobId: string, params: JobParams) {
  const started = Date.now();
  const ctx: QuotaCtx = { admin, usedThisRun: 0, apiFailures: 0, keyIndex: 0, quotaExhausted: false };
  let totalEnqueued = 0;
  let totalSkipped = 0;
  let seedsProcessed = 0;
  const bySource: Record<string, { enqueued: number; skipped: number; ids: number; runs: number }> = {};
  const record = (m: string, r: CrawlResult) => {
    const b = bySource[m] ?? { enqueued: 0, skipped: 0, ids: 0, runs: 0 };
    b.enqueued += r.enqueued; b.skipped += r.skipped; b.ids += r.ids; b.runs++;
    bySource[m] = b;
  };
  // quotaExhausted short-circuits every remaining crawl step: once all keys
  // are dead, further YouTube calls can only fail.
  const overBudget = () =>
    ctx.quotaExhausted || ctx.usedThisRun >= DAILY_QUOTA_CAP * BUDGET_STOP_RATIO;
  const overDeadline = () => Date.now() - started >= SOFT_DEADLINE_MS;

  await updateJob(admin, jobId, { status: 'running', started_at: new Date().toISOString() });

  try {
    // Single-seed explicit request
    if (params.targetSeedId) {
      const methods = params.requestedMethod && params.requestedMethod !== 'auto'
        ? [params.requestedMethod]
        : ['playlist_collab', 'description_mention'];
      // Prefetch seed description once for description_mention (channels.list = 1 unit).
      let seedDesc = '';
      if (methods.includes('description_mention')) {
        if (await reserveQuota(ctx, COST_CHANNEL_BATCH)) {
          const info = await ytFetch(
            ctx,
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(params.targetSeedId)}&key=${YOUTUBE_API_KEY}`,
          );
          seedDesc = info?.items?.[0]?.snippet?.description ?? '';
        }
      }
      for (const m of methods) {
        if (overBudget() || overDeadline() || await isCancelled(admin, jobId)) break;
        let r: CrawlResult = { enqueued: 0, skipped: 0, ids: 0 };
        if (m === 'playlist_collab') r = await crawlPlaylistCollab(admin, ctx, params.targetSeedId, 1);
        else if (m === 'description_mention') r = await crawlDescriptionMention(admin, ctx, seedDesc, params.targetSeedId, 1);
        totalEnqueued += r.enqueued; totalSkipped += r.skipped; record(m, r);
      }
      seedsProcessed = 1;
    } else {
      // P1.3: allocation-driven fair scheduler.
      // Each source runs against its own quota envelope so no single source
      // can starve the others (previously topic_search consumed the whole
      // budget on rich runs).
      const allocations = await loadAllocations(admin);
      const totalCap = DAILY_QUOTA_CAP * BUDGET_STOP_RATIO;
      const budgets: Record<string, number> = {};
      for (const a of allocations) {
        if (!a.enabled) continue;
        budgets[a.source] = Math.floor(totalCap * (Number(a.share_percent) / 100));
      }
      const spentAtStart = ctx.usedThisRun;
      const spentForSource = (src: string) =>
        (bySource[src]?.runs ? 0 : 0) + Math.max(0, ctx.usedThisRun - spentAtStart - Object.entries(bySource)
          .filter(([k]) => k !== src && k !== `topic_search:${src}`)
          .reduce((_a, _b) => _a, 0));
      // Simpler: track spend per source explicitly.
      const spend: Record<string, number> = { topic_search: 0, playlist_collab: 0, description_mention: 0 };
      const canSpend = (src: string, cost: number) =>
        (budgets[src] ?? 0) > 0 && spend[src] + cost <= (budgets[src] ?? 0);
      const track = (src: string, cost: number) => { spend[src] = (spend[src] ?? 0) + cost; };

      // 1) topic_search (each query costs ~COST_SEARCH + hydration).
      if ((budgets.topic_search ?? 0) > 0) {
        const queries = await loadTopicQueries(admin);
        for (const q of queries) {
          if (overBudget() || overDeadline() || await isCancelled(admin, jobId)) break;
          if (!canSpend('topic_search', COST_SEARCH + COST_CHANNEL_BATCH)) break;
          const before = ctx.usedThisRun;
          const r = await crawlTopicSearch(admin, ctx, q.query, q.language);
          track('topic_search', ctx.usedThisRun - before);
          totalEnqueued += r.enqueued; totalSkipped += r.skipped; record(`topic_search:${q.language}`, r);
          seedsProcessed++;
          // Close the learning loop: the scheduler boosts queries that
          // actually produce candidates and the nightly prune retires the
          // ones that never do, so the query bank improves on its own.
          await admin.rpc('record_topic_query_yield', {
            p_query_id: q.id,
            p_candidates: r.enqueued + r.skipped,
            p_approved: r.enqueued,
          });
          if (seedsProcessed % 5 === 0) {
            await updateJob(admin, jobId, {
              quota_used: ctx.usedThisRun, enqueued_count: totalEnqueued, skipped_count: totalSkipped,
              seeds_processed: seedsProcessed, api_failures: ctx.apiFailures,
              stats: { by_source: bySource, spend, budgets },
            });
          }
        }
      }

      // 2) Approved-seed methods with per-source budgets.
      const wantPlaylist = (budgets.playlist_collab ?? 0) > 0;
      const wantDesc = (budgets.description_mention ?? 0) > 0;
      if (wantPlaylist || wantDesc) {
        const seeds = await loadApprovedSeeds(admin, MAX_SEEDS_PER_RUN);
        const descMap = new Map<string, string>();
        if (wantDesc && seeds.length > 0) {
          const seedItems = await hydrateChannelsBatched(ctx, seeds.map((s) => s.youtube_channel_id));
          for (const it of seedItems) descMap.set(it.id, it.snippet?.description ?? '');
        }

        for (const s of seeds) {
          if (overBudget() || overDeadline() || await isCancelled(admin, jobId)) break;
          // Alternate methods; skip any whose per-source budget is exhausted.
          const order = wantPlaylist && wantDesc
            ? (seedsProcessed % 2 === 0 ? ['playlist_collab','description_mention'] : ['description_mention','playlist_collab'])
            : (wantPlaylist ? ['playlist_collab'] : ['description_mention']);
          for (const method of order) {
            if (!canSpend(method, COST_PLAYLISTS + COST_CHANNEL_BATCH)) continue;
            const before = ctx.usedThisRun;
            let r: CrawlResult = { enqueued: 0, skipped: 0, ids: 0 };
            if (method === 'playlist_collab') r = await crawlPlaylistCollab(admin, ctx, s.youtube_channel_id, 1);
            else r = await crawlDescriptionMention(admin, ctx, descMap.get(s.youtube_channel_id) ?? '', s.youtube_channel_id, 1);
            track(method, ctx.usedThisRun - before);
            totalEnqueued += r.enqueued; totalSkipped += r.skipped; record(method, r);
          }
          seedsProcessed++;
          if (seedsProcessed % 10 === 0) {
            await updateJob(admin, jobId, {
              quota_used: ctx.usedThisRun, enqueued_count: totalEnqueued, skipped_count: totalSkipped,
              seeds_processed: seedsProcessed, api_failures: ctx.apiFailures,
              stats: { by_source: bySource, spend, budgets },
            });
          }
        }
      }

      // Emit per-source metrics for the ops dashboard.
      for (const [src, units] of Object.entries(spend)) {
        await admin.from('ops_metrics').insert({
          metric: 'discovery.quota.spent',
          value: units,
          tags: { source: src, job: jobId },
        });
      }
    }

    const cancelled = await isCancelled(admin, jobId);
    await updateJob(admin, jobId, {
      status: cancelled ? 'cancelled' : (overDeadline() ? 'timed_out' : 'succeeded'),
      finished_at: new Date().toISOString(),
      quota_used: ctx.usedThisRun,
      enqueued_count: totalEnqueued,
      skipped_count: totalSkipped,
      seeds_processed: seedsProcessed,
      api_failures: ctx.apiFailures,
      quota_exhausted: ctx.quotaExhausted,
      stats: {
        by_source: bySource,
        duration_ms: Date.now() - started,
        deadline_ms: SOFT_DEADLINE_MS,
        daily_quota_cap: DAILY_QUOTA_CAP,
      },
    });
    await admin.from('ops_metrics').insert([
      { metric: 'discovery.job.duration_ms', value: Date.now() - started, tags: { job: jobId, status: cancelled ? 'cancelled' : (overDeadline() ? 'timed_out' : 'succeeded') } },
      { metric: 'discovery.job.enqueued', value: totalEnqueued, tags: { job: jobId } },
      { metric: 'discovery.job.api_failures', value: ctx.apiFailures, tags: { job: jobId } },
    ]);
  } catch (err) {
    console.error('discovery job failed', err);
    await updateJob(admin, jobId, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      error: String(err instanceof Error ? err.message : err).slice(0, 500),
      quota_used: ctx.usedThisRun,
      enqueued_count: totalEnqueued,
      skipped_count: totalSkipped,
      seeds_processed: seedsProcessed,
      api_failures: ctx.apiFailures,
      quota_exhausted: ctx.quotaExhausted,
      stats: { by_source: bySource, duration_ms: Date.now() - started },
    });
    await admin.from('dead_letter_queue').insert({
      job_type: 'discovery_job',
      payload: { job_id: jobId, seedsProcessed, enqueued: totalEnqueued, quota_used: ctx.usedThisRun },
      error: String(err instanceof Error ? err.message : err).slice(0, 500),
    });
    await admin.from('ops_metrics').insert({
      metric: 'discovery.job.failed', value: 1, tags: { job: jobId },
    });
  }
}

// ────────────────────────────────── Entry ───────────────────────────────────

// Deno.EdgeRuntime is provided by Supabase edge runtime for background tasks.
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const cronSecret = req.headers.get('X-Cron-Secret');
    const cronToken = req.headers.get('x-cron-token');
    const isCron =
      (!!cronSecret && cronSecret === Deno.env.get('CRON_SECRET')) ||
      (!!cronToken && cronToken === Deno.env.get('INGEST_CRON_TOKEN'));
    let requestedBy: string | null = null;

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
      requestedBy = user.id;
    }

    if (!YOUTUBE_API_KEYS.length) return json({ error: 'YOUTUBE_API_KEY not configured' }, 500);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    // GET-style status inspection: ?job=<id> or body.job
    const url = new URL(req.url);
    const jobParam = url.searchParams.get('job') ?? body?.job;
    if (jobParam && req.method !== 'POST') {
      const { data } = await admin.from('discovery_jobs').select('*').eq('id', jobParam).maybeSingle();
      return json({ ok: true, job: data });
    }

    // Cancel request
    if (body?.action === 'cancel' && body?.job) {
      await admin.from('discovery_jobs').update({ cancel_requested: true }).eq('id', String(body.job));
      return json({ ok: true, cancelled: body.job });
    }

    // Idempotency: reject if a job is already running unless force=true.
    if (!body?.force) {
      const { data: running } = await admin
        .from('discovery_jobs').select('id')
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false }).limit(1);
      if (running && running.length > 0) {
        return json({ ok: true, already_running: true, job: (running[0] as any).id }, 202);
      }
    }

    // Create job row
    const { data: jobRow, error: jobErr } = await admin
      .from('discovery_jobs')
      .insert({
        status: 'queued',
        mode: body?.method ?? (body?.source_channel_id ? 'targeted' : 'auto'),
        requested_by: requestedBy,
      })
      .select('id')
      .single();
    if (jobErr || !jobRow) return json({ error: 'failed to create job', detail: jobErr?.message }, 500);
    const jobId = (jobRow as any).id as string;

    const params: JobParams = {
      targetSeedId: body?.source_channel_id,
      requestedMethod: body?.method,
    };

    // Fire-and-forget background execution.
    const work = runDiscoveryJob(admin, jobId, params);
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(work);
    } else {
      // Fallback for local dev — still returns 202 but awaits.
      work.catch((e) => console.error('bg work error', e));
    }

    return json({ ok: true, job: jobId, status: 'accepted' }, 202);
  } catch (err) {
    console.error('discover-channels error', err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
