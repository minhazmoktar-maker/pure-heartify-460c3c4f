/**
 * discover-trusted-sources — Lane 1 of the corpus discovery strategy.
 *
 * Resolves every entry in `verified_scholars` and `trusted_institutions` to
 * one or more official YouTube channels and files them into
 * `channel_candidates` as Tier A, source='institution_seed', status='pending'.
 *
 * NEVER auto-approves. Reviewers still promote the candidate through the
 * standard moderation pipeline. This function only removes the manual
 * copy/paste step of turning trusted seeds into concrete channel candidates.
 *
 * Resolution strategy (per seed):
 *   1) If youtube_channel_ids is non-empty → channels.list?id= (1 unit / 50 ids)
 *   2) Else if handles is non-empty         → channels.list?forHandle=  (1 unit each)
 *   3) Else                                 → search.list?q=name        (100 units)
 *
 * Quota-safe: shares the same discovery_quota_ledger cap as discover-channels,
 * and short-circuits once the daily cap is 90% consumed.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const YOUTUBE_API_KEY =
  Deno.env.get('YOUTUBE_API_KEY') ?? Deno.env.get('YOUTUBE_API_KEY_2') ?? '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DAILY_QUOTA_CAP = Number(Deno.env.get('DISCOVERY_DAILY_QUOTA') ?? 4000);
const BUDGET_STOP_RATIO = 0.9;
const SOFT_DEADLINE_MS = 4 * 60_000;
const CHANNELS_BATCH = 50;

const COST_CHANNELS_LIST = 1;
const COST_SEARCH = 100;

type Admin = ReturnType<typeof createClient>;

interface Seed {
  kind: 'scholar' | 'institution';
  name: string;
  handles: string[];
  known_ids: string[];
  match_pattern?: string;
  language?: string | null;
  country?: string | null;
  organization_type?: string | null;
  weight: number;
  notes?: string | null;
}

interface QuotaCtx {
  admin: Admin;
  used: number;
  failures: number;
  deadline: number;
}

// ─── quota + fetch helpers ────────────────────────────────────────────────

async function currentQuotaUsed(admin: Admin): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from('discovery_quota_ledger')
    .select('units_used')
    .eq('day', day)
    .eq('api_name', 'youtube_v3')
    .maybeSingle();
  return (data?.units_used as number | undefined) ?? 0;
}

async function reserveQuota(ctx: QuotaCtx, cost: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const used = await currentQuotaUsed(ctx.admin);
  if (used + cost > DAILY_QUOTA_CAP * BUDGET_STOP_RATIO) return false;
  await ctx.admin
    .from('discovery_quota_ledger')
    .upsert(
      { day, api_name: 'youtube_v3', units_used: used + cost, updated_at: new Date().toISOString() },
      { onConflict: 'day,api_name' },
    );
  ctx.used += cost;
  return true;
}

async function ytFetch(ctx: QuotaCtx, url: string, attempts = 3): Promise<any | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if ([400, 403, 404].includes(res.status)) {
        console.error('yt api error', res.status, (await res.text()).slice(0, 160));
        ctx.failures++;
        return null;
      }
      await new Promise((r) => setTimeout(r, 300 * 2 ** i));
    } catch (e) {
      console.error('yt fetch failed', String(e).slice(0, 160));
      await new Promise((r) => setTimeout(r, 300 * 2 ** i));
    }
  }
  ctx.failures++;
  return null;
}

// ─── resolution ───────────────────────────────────────────────────────────

interface ResolvedChannel {
  channelId: string;
  title: string;
  description: string;
  handle?: string;
  subscriberCount?: number;
  country?: string;
}

async function batchChannelsById(ctx: QuotaCtx, ids: string[]): Promise<ResolvedChannel[]> {
  const out: ResolvedChannel[] = [];
  for (let i = 0; i < ids.length; i += CHANNELS_BATCH) {
    if (!(await reserveQuota(ctx, COST_CHANNELS_LIST))) return out;
    const slice = ids.slice(i, i + CHANNELS_BATCH);
    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics` +
      `&id=${slice.join(',')}&maxResults=${slice.length}&key=${YOUTUBE_API_KEY}`;
    const data = await ytFetch(ctx, url);
    for (const it of data?.items ?? []) {
      out.push({
        channelId: it.id,
        title: it.snippet?.title ?? '',
        description: it.snippet?.description ?? '',
        handle: it.snippet?.customUrl,
        subscriberCount: Number(it.statistics?.subscriberCount ?? 0) || undefined,
        country: it.snippet?.country,
      });
    }
  }
  return out;
}

async function resolveByHandle(ctx: QuotaCtx, handle: string): Promise<ResolvedChannel | null> {
  if (!(await reserveQuota(ctx, COST_CHANNELS_LIST))) return null;
  const clean = handle.replace(/^@/, '');
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics` +
    `&forHandle=@${encodeURIComponent(clean)}&key=${YOUTUBE_API_KEY}`;
  const data = await ytFetch(ctx, url);
  const it = data?.items?.[0];
  if (!it) return null;
  return {
    channelId: it.id,
    title: it.snippet?.title ?? '',
    description: it.snippet?.description ?? '',
    handle: it.snippet?.customUrl,
    subscriberCount: Number(it.statistics?.subscriberCount ?? 0) || undefined,
    country: it.snippet?.country,
  };
}

async function resolveBySearch(ctx: QuotaCtx, query: string, max = 3): Promise<ResolvedChannel[]> {
  if (!(await reserveQuota(ctx, COST_SEARCH))) return [];
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel` +
    `&maxResults=${max}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
  const data = await ytFetch(ctx, url);
  const ids: string[] = (data?.items ?? [])
    .map((i: any) => i?.id?.channelId)
    .filter(Boolean);
  if (!ids.length) return [];
  // Enrich via channels.list so we get stats + real title/description.
  return await batchChannelsById(ctx, ids);
}

// ─── candidate insertion ──────────────────────────────────────────────────

async function insertCandidates(
  admin: Admin,
  seed: Seed,
  resolutions: Array<{ channel: ResolvedChannel; method: 'known_id' | 'handle' | 'search' }>,
): Promise<{ inserted: number; skipped: number }> {
  if (!resolutions.length) return { inserted: 0, skipped: 0 };

  const ids = resolutions.map((r) => r.channel.channelId);
  const { data: existing } = await admin
    .from('channel_candidates')
    .select('youtube_channel_id')
    .in('youtube_channel_id', ids);
  const seen = new Set((existing ?? []).map((r: any) => r.youtube_channel_id));

  const rows = resolutions
    .filter((r) => !seen.has(r.channel.channelId))
    .map((r) => {
      const c = r.channel;
      const orgType = seed.kind === 'institution' ? (seed.organization_type ?? 'institute') : 'scholar';
      const evidence = {
        lane: 'trusted_source',
        seed_kind: seed.kind,
        seed_name: seed.name,
        resolution_method: r.method,
        match_pattern: seed.match_pattern ?? null,
        seed_weight: seed.weight,
        seed_notes: seed.notes ?? null,
      };
      return {
        youtube_channel_id: c.channelId,
        handle: c.handle ?? null,
        title: c.title || seed.name,
        description: c.description ?? '',
        language: seed.language ?? null,
        country: c.country ?? seed.country ?? null,
        subscriber_count: c.subscriberCount ?? null,
        source: 'institution_seed',
        status: 'pending',
        confidence: 98,
        duplicate_risk: 'low',
        priority_score: 98,
        halal_topic_hint: 'islamic',
        language_detected: seed.language ?? null,
        educational_quality: 90,
        organization_type: orgType,
        tier: 'A',
        tier_reason: [
          'trusted_source_lane',
          seed.kind === 'scholar' ? 'verified_scholar_registry' : 'trusted_institution_registry',
          `resolved_via_${r.method}`,
        ],
        discovery_method: 'trusted_source',
        crawl_depth: 0,
        evidence,
        confidence_breakdown: {
          topic_relevance: 1.0,
          educational_quality: 0.9,
          discovery_source: 0.95,
          organization: 1.0,
          language_confidence: seed.language ? 0.9 : 0.5,
          duplicate_probability: 0.05,
        },
      };
    });

  if (!rows.length) return { inserted: 0, skipped: resolutions.length };

  const { error, count } = await admin
    .from('channel_candidates')
    .insert(rows, { count: 'exact' });
  if (error) {
    console.error('insert candidates failed', error.message);
    return { inserted: 0, skipped: resolutions.length };
  }
  return { inserted: count ?? rows.length, skipped: resolutions.length - (count ?? rows.length) };
}

// ─── main ─────────────────────────────────────────────────────────────────

async function runJob(admin: Admin, jobId: string) {
  const ctx: QuotaCtx = { admin, used: 0, failures: 0, deadline: Date.now() + SOFT_DEADLINE_MS };

  const [scholarsRes, instRes] = await Promise.all([
    admin.from('verified_scholars').select('display_name,handles,youtube_channel_ids,language,country,weight,notes'),
    admin.from('trusted_institutions').select('name,match_pattern,organization_type,language,country,weight,notes'),
  ]);

  const seeds: Seed[] = [
    ...((scholarsRes.data ?? []) as any[]).map((s) => ({
      kind: 'scholar' as const,
      name: s.display_name,
      handles: (s.handles ?? []) as string[],
      known_ids: (s.youtube_channel_ids ?? []) as string[],
      language: s.language,
      country: s.country,
      weight: Number(s.weight ?? 1),
      notes: s.notes,
    })),
    ...((instRes.data ?? []) as any[]).map((i) => ({
      kind: 'institution' as const,
      name: i.name,
      handles: [] as string[],
      known_ids: [] as string[],
      match_pattern: i.match_pattern,
      organization_type: i.organization_type,
      language: i.language,
      country: i.country,
      weight: Number(i.weight ?? 1),
      notes: i.notes,
    })),
  ];

  let processed = 0;
  let inserted = 0;
  let skipped = 0;
  let quotaExhausted = false;

  // 1) Batch-resolve all seeds with known channel ids first (cheapest).
  const withIds = seeds.filter((s) => s.known_ids.length);
  const allKnownIds = withIds.flatMap((s) => s.known_ids);
  const idToSeed = new Map<string, Seed>();
  for (const s of withIds) for (const id of s.known_ids) idToSeed.set(id, s);
  if (allKnownIds.length) {
    const resolved = await batchChannelsById(ctx, allKnownIds);
    const bySeed = new Map<Seed, ResolvedChannel[]>();
    for (const c of resolved) {
      const s = idToSeed.get(c.channelId);
      if (!s) continue;
      const arr = bySeed.get(s) ?? [];
      arr.push(c);
      bySeed.set(s, arr);
    }
    for (const [s, list] of bySeed) {
      const r = await insertCandidates(admin, s, list.map((c) => ({ channel: c, method: 'known_id' as const })));
      inserted += r.inserted;
      skipped += r.skipped;
      processed++;
    }
  }

  // 2) Handle-based resolution.
  for (const s of seeds) {
    if (Date.now() > ctx.deadline) break;
    if (!s.handles.length) continue;
    if (s.known_ids.length) continue; // already resolved above
    const resolutions: Array<{ channel: ResolvedChannel; method: 'handle' }> = [];
    for (const h of s.handles) {
      const c = await resolveByHandle(ctx, h);
      if (c) resolutions.push({ channel: c, method: 'handle' });
    }
    const r = await insertCandidates(admin, s, resolutions);
    inserted += r.inserted;
    skipped += r.skipped;
    processed++;
  }

  // 3) Search fallback (expensive — 100 units each). Do this only within budget.
  for (const s of seeds) {
    if (Date.now() > ctx.deadline) break;
    if (s.known_ids.length || s.handles.length) continue;
    const used = await currentQuotaUsed(admin);
    if (used + COST_SEARCH > DAILY_QUOTA_CAP * BUDGET_STOP_RATIO) {
      quotaExhausted = true;
      break;
    }
    const query = s.kind === 'institution' && s.match_pattern
      ? `${s.name} official`
      : `${s.name}`;
    const channels = await resolveBySearch(ctx, query, s.kind === 'institution' ? 2 : 3);
    const r = await insertCandidates(admin, s, channels.map((c) => ({ channel: c, method: 'search' as const })));
    inserted += r.inserted;
    skipped += r.skipped;
    processed++;
  }

  await admin
    .from('discovery_jobs')
    .update({
      status: 'succeeded',
      finished_at: new Date().toISOString(),
      quota_used: ctx.used,
      enqueued_count: inserted,
      skipped_count: skipped,
      seeds_processed: processed,
      api_failures: ctx.failures,
      stats: {
        lane: 'trusted_source',
        seeds_total: seeds.length,
        quota_exhausted: quotaExhausted,
      },
    })
    .eq('id', jobId);

  console.log('trusted-source lane done', { processed, inserted, skipped, quota: ctx.used });
}

// ─── HTTP entry ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!YOUTUBE_API_KEY) {
    return new Response(JSON.stringify({ error: 'YOUTUBE_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: job, error } = await admin
    .from('discovery_jobs')
    .insert({
      mode: 'trusted_source',
      status: 'running',
      started_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
      stats: { lane: 'trusted_source' },
    })
    .select('id')
    .single();

  if (error || !job) {
    return new Response(JSON.stringify({ error: error?.message ?? 'job insert failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // @ts-ignore EdgeRuntime.waitUntil is available in Supabase Edge runtime.
  EdgeRuntime.waitUntil(
    runJob(admin, job.id as string).catch(async (e) => {
      console.error('trusted-source lane crashed', e);
      await admin
        .from('discovery_jobs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          stats: { lane: 'trusted_source', error: String(e).slice(0, 500) },
        })
        .eq('id', job.id as string);
    }),
  );

  return new Response(JSON.stringify({ status: 'accepted', job_id: job.id }), {
    status: 202,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
