// Per-surface retrievers. Each function OWNS its candidate SQL and its
// scoring. They never call one another. Universal filters (blocklist,
// impressions, kids-mode, premium gate) are applied by the dispatcher.

import type { SurfaceVideo, SurfaceContext } from "./types.ts";
import { traceStep } from "./types.ts";
import { shuffleWithSeed, sessionSeed } from "./diversity.ts";
import { DEFAULT_FEED_CONFIG, type FeedRuntimeConfig } from "./config.ts";
import { applyBenefitRanking } from "./benefit.ts";

/**
 * Personalization seed. Mixes session + user + slider + device/browser so
 * two users on the same session-shaped device never get the same shuffle,
 * and moving the slider visibly reshapes the feed. When the runtime flag is
 * killed the slider and device terms drop out (legacy behaviour).
 */
export function personalSeed(ctx: SurfaceContext, salt: string): number {
  const cfg: FeedRuntimeConfig = (ctx.config as FeedRuntimeConfig) ?? DEFAULT_FEED_CONFIG;
  if (!cfg.sliderEnabled) return sessionSeed(ctx.sessionId + salt);
  const div = Math.round((ctx.diversityLevel ?? 50) * cfg.weights.diversity_slider);
  const device = `${ctx.deviceClass ?? "?"}:${ctx.browser ?? "?"}`;
  return sessionSeed(
    `${ctx.sessionId}|${ctx.userId ?? "anon"}|d${div}|${device}|${salt}`,
  );
}


async function callPool(
  ctx: SurfaceContext,
  fn: string,
  args: Record<string, unknown>,
): Promise<SurfaceVideo[]> {
  const { data, error } = await ctx.service.rpc(fn, args);
  if (error) {
    console.warn(`[surfaces] ${fn} error`, error.message);
    return [];
  }
  return (data ?? []) as SurfaceVideo[];
}

// ---------- Independent retrievers ----------

export async function retrieveRecentlyAdded(ctx: SurfaceContext) {
  const pool = await callPool(ctx, "pool_recently_added", {
    _limit: 60, _window_hours: 168, _exclude_premium: !ctx.isPremium,
  });
  // Pool is already time-DESC. Slight session jitter for repeat-visit novelty.
  const jittered = shuffleWithSeed(pool.slice(0, 40), sessionSeed(ctx.sessionId + "recent"));
  // Reorder: keep newest 8 pinned, jitter the rest.
  return [...pool.slice(0, 8), ...jittered.filter((v) => !pool.slice(0, 8).some((p) => p.video_id === v.video_id))];
}

export async function retrieveNewVideos(ctx: SurfaceContext) {
  const pool = await callPool(ctx, "pool_new_videos", {
    _limit: 60, _window_days: 7, _exclude_premium: !ctx.isPremium,
  });
  return shuffleWithSeed(pool, sessionSeed(ctx.sessionId + "newvid")).sort((a, b) => {
    const ap = a.published_at ? new Date(a.published_at).getTime() : 0;
    const bp = b.published_at ? new Date(b.published_at).getTime() : 0;
    return bp - ap;
  });
}

export async function retrieveTrending(ctx: SurfaceContext) {
  const pool = await callPool(ctx, "pool_trending_7d", {
    _limit: 80, _exclude_premium: !ctx.isPremium,
  });
  return shuffleWithSeed(pool, sessionSeed(ctx.sessionId + "trend"));
}

export async function retrievePopularWeek(ctx: SurfaceContext) {
  const pool = await callPool(ctx, "pool_popular_week", {
    _limit: 80, _exclude_premium: !ctx.isPremium,
  });
  return pool;
}

export async function retrieveHiddenGems(ctx: SurfaceContext) {
  const pool = await callPool(ctx, "pool_hidden_gems", {
    _limit: 80, _min_halal: 90, _max_views: 5000, _exclude_premium: !ctx.isPremium,
  });
  return shuffleWithSeed(pool, sessionSeed(ctx.sessionId + "gem"));
}

export async function retrieveNewChannels(ctx: SurfaceContext) {
  return callPool(ctx, "pool_new_channels", {
    _limit: 24, _window_days: 45, _exclude_premium: !ctx.isPremium,
  });
}

export async function retrieveContinueWatching(ctx: SurfaceContext) {
  if (!ctx.userId) return [];
  return callPool(ctx, "pool_continue_watching", { _user_id: ctx.userId, _limit: 12 });
}

export async function retrieveBecauseYouWatched(ctx: SurfaceContext) {
  if (!ctx.userId) return [];
  return callPool(ctx, "pool_because_you_watched", {
    _user_id: ctx.userId, _limit: 40, _exclude_premium: !ctx.isPremium,
  });
}


/**
 * Hard language gate applied at the DB layer so an English-only viewer never
 * has other-language rows in their candidate pool (they used to survive as
 * "tail" rows and leak into deeper pages).
 */
function langFilter<T>(q: T, ctx: SurfaceContext): T {
  const langs = (ctx.contentLanguages ?? [])
    .filter((l): l is string => typeof l === "string" && !!l)
    .map((l) => l.toLowerCase());
  if (!langs.length) return q;
  // deno-lint-ignore no-explicit-any
  return (q as any).in("content_language", langs) as T;
}

const CURATED_COLS =
  "video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language,visual_state";

/**
 * Cold-start heuristics — used when personalization is sparse (few or no
 * taste signals). Sources of intent, in priority order:
 *   1. Recently played topics reported by the client (this session's
 *      categories, no server history required).
 *   2. Declared onboarding interests.
 *   3. Recent watch-history categories.
 *   4. Broad high-trust round-robin across all categories.
 * Device/browser signals feed the shuffle seed so two cold users on the
 * same topic set still see different orderings.
 */
export async function retrieveColdStart(
  ctx: SurfaceContext,
): Promise<{ items: SurfaceVideo[]; strategy: string; topics: string[] }> {
  const cfg: FeedRuntimeConfig = (ctx.config as FeedRuntimeConfig) ?? DEFAULT_FEED_CONFIG;
  const topics = new Map<string, number>();
  const strategies: string[] = [];

  for (const t of (ctx.recentTopics ?? []).slice(0, 8)) {
    if (typeof t === "string" && t.trim()) {
      topics.set(t, (topics.get(t) ?? 0) + cfg.weights.cold_start_topic);
    }
  }
  if (topics.size) strategies.push("recent_topics");

  if (ctx.userId) {
    const [{ data: interests }, { data: hist }] = await Promise.all([
      ctx.service.from("user_interests")
        .select("primary_interest,secondary_interest,exploration_interest")
        .eq("user_id", ctx.userId).limit(1),
      ctx.service.from("watch_history").select("video_id").eq("user_id", ctx.userId)
        .gte("watched_at", new Date(Date.now() - 30 * 86400 * 1000).toISOString()).limit(50),
    ]);
    const row = (interests ?? [])[0] as
      | { primary_interest?: string | null; secondary_interest?: string | null; exploration_interest?: string | null }
      | undefined;
    for (const [v, w] of [
      [row?.primary_interest, 0.6], [row?.secondary_interest, 0.45], [row?.exploration_interest, 0.35],
    ] as [string | null | undefined, number][]) {
      if (v) topics.set(v, (topics.get(v) ?? 0) + w);
    }
    if (row?.primary_interest) strategies.push("interests");

    const seedIds = (hist ?? []).map((r: { video_id: string }) => r.video_id);
    if (seedIds.length) {
      const { data: seedRows } = await ctx.service
        .from("curated_videos").select("category").in("video_id", seedIds).limit(50);
      for (const r of seedRows ?? []) {
        const c = (r as { category: string | null }).category;
        if (c) topics.set(c, (topics.get(c) ?? 0) + 0.35);
      }
      if ((seedRows ?? []).length) strategies.push("watch_categories");
    }
  }

  let chosen = Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);

  // Nothing at all — broad discovery across every approved category.
  if (!chosen.length) {
    const { data: cats } = await ctx.service
      .from("curated_videos").select("category")
      .in("moderation_state", ["approved", "auto_approved"])
      .eq("is_hidden", false).eq("is_archived", false)
      .not("category", "is", null).limit(600);
    const uniq = Array.from(new Set((cats ?? []).map((r: any) => r.category).filter(Boolean))) as string[];
    chosen = shuffleWithSeed(uniq, personalSeed(ctx, "coldbroad")).slice(0, 8);
    strategies.push("broad_discovery");
  }

  // Slider widens/narrows how many topics get a slot.
  const level = cfg.sliderEnabled ? (ctx.diversityLevel ?? 50) : 50;
  const topicCount = Math.max(3, Math.min(chosen.length, Math.round(3 + (level / 100) * 5)));
  chosen = chosen.slice(0, topicCount);
  const perTopic = Math.max(3, Math.round(6 - (level / 100) * 2));

  const buckets: SurfaceVideo[][] = [];
  await Promise.all(chosen.map(async (c, idx) => {
    const { data } = await ctx.service
      .from("curated_videos").select(CURATED_COLS)
      .in("moderation_state", ["approved", "auto_approved"])
      .eq("is_hidden", false).eq("is_archived", false)
      .eq("category", c)
      .or("visual_state.is.null,visual_state.in.(unchecked,clean)")
      .gte("halal_score", 85)
      .order("ingested_at", { ascending: false })
      .limit(perTopic * 6);
    // Device/browser jitter keeps identical-topic cold users apart.
    const jitter = personalSeed(ctx, `cold:${c}:${cfg.weights.cold_start_device_jitter}`);
    buckets[idx] = shuffleWithSeed(((data ?? []) as SurfaceVideo[]), jitter).slice(0, perTopic);
  }));

  const out: SurfaceVideo[] = [];
  for (let i = 0; i < perTopic; i++) {
    for (const b of buckets) if (b?.[i]) out.push(b[i]);
  }

  // Interest keys don't always map to a category — if the topic buckets came
  // back thin, top up with fresh high-trust content so cold users never see
  // an empty feed.
  if (out.length < 8) {
    const { data } = await ctx.service
      .from("curated_videos").select(CURATED_COLS)
      .in("moderation_state", ["approved", "auto_approved"])
      .eq("is_hidden", false).eq("is_archived", false)
      .gte("halal_score", 85)
      .order("ingested_at", { ascending: false })
      .limit(120);
    const topUp = shuffleWithSeed(((data ?? []) as SurfaceVideo[]), personalSeed(ctx, "coldtopup"));
    const have = new Set(out.map((v) => v.video_id));
    for (const v of topUp) if (!have.has(v.video_id)) out.push(v);
    strategies.push("fresh_topup");
  }

  return { items: out, strategy: strategies.join("+") || "broad_discovery", topics: chosen };
}

// For You v3 — Wave M2 Beneficial Intelligence Engine.
// Ranks candidates by BENEFIT (trust + goal alignment + novelty + personal
// affinity + freshness), never by view count. Falls back to legacy v2 pool
// if the new RPC is unavailable, then to cold-start heuristics.
export async function retrieveForYou(ctx: SurfaceContext) {
  if (!ctx.userId) return [];
  const cfg: FeedRuntimeConfig = (ctx.config as FeedRuntimeConfig) ?? DEFAULT_FEED_CONFIG;

  // Kick a background refresh so the next request reflects new activity.
  ctx.service.rpc("refresh_user_taste_profile", { _user_id: ctx.userId })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn("[for_you] refresh error", error.message);
    });

  const { data: profile } = await ctx.service
    .from("user_taste_profiles").select("signal_count").eq("user_id", ctx.userId).maybeSingle();
  const signalCount = (profile as { signal_count?: number } | null)?.signal_count ?? 0;
  const isCold = signalCount < cfg.coldStart.min_signals;
  traceStep(ctx, "taste_profile", { signalCount, isCold, minSignals: cfg.coldStart.min_signals });

  let personalized: SurfaceVideo[] = [];

  // Try the beneficial engine first — it works for both warm and lukewarm users
  // because the trust + goal + novelty terms are meaningful without any history.
  const beneficial = await ctx.service.rpc("pool_beneficial_v1", {
    _user_id: ctx.userId, _limit: 160, _exclude_premium: !ctx.isPremium,
  });
  if (beneficial.error) {
    console.warn("[for_you] pool_beneficial_v1 error", beneficial.error.message);
    traceStep(ctx, "pool_beneficial_v1", { error: beneficial.error.message });
  } else {
    personalized = (beneficial.data ?? []) as SurfaceVideo[];
    traceStep(ctx, "pool_beneficial_v1", { returned: personalized.length });
  }

  // Cold-start blend: when signals are sparse, reserve a share of the ranked
  // head for topic/device-diversified cold-start picks.
  if (cfg.coldStart.enabled && (isCold || personalized.length < 40)) {
    const cold = await retrieveColdStart(ctx);
    traceStep(ctx, "cold_start", {
      strategy: cold.strategy, topics: cold.topics, returned: cold.items.length,
    });
    (ctx as any).coldStartStrategy = cold.strategy;
    if (isCold) {
      const share = cfg.coldStart.topic_share;
      const keep = Math.round(personalized.length * (1 - share));
      personalized = interleave(cold.items, personalized.slice(0, keep));
    } else {
      personalized = personalized.concat(cold.items);
    }
  } else if (personalized.length < 40 && signalCount >= cfg.coldStart.min_signals) {
    const legacy = await callPool(ctx, "pool_for_you_v2", {
      _user_id: ctx.userId, _limit: 120, _exclude_premium: !ctx.isPremium,
    });
    traceStep(ctx, "pool_for_you_v2", { returned: legacy.length });
    personalized = personalized.concat(legacy);
  }

  // Exploration slot: small dose of fresh content so drift is possible.
  const explore = await callPool(ctx, "pool_recently_added", {
    _limit: 20, _window_hours: 72, _exclude_premium: !ctx.isPremium,
  });
  const merged = [...personalized, ...explore];
  const dedup = new Map<string, SurfaceVideo>();
  for (const v of merged) if (!dedup.has(v.video_id)) dedup.set(v.video_id, v);
  // Preserve ranked order for the personalized head; only jitter the tail.
  // A high diversity slider shrinks the pinned head so more of the pool moves.
  // MVP-5: benefit-ranked arm (10% of signed-in users by default). Re-orders
  // the pool by measured T+7/30/90 "worth it" outcomes before head/tail split.
  const benefit = await applyBenefitRanking(ctx, Array.from(dedup.values()));
  const arr = benefit.items;
  (ctx as any).benefitArm = benefit.arm;
  const level = cfg.sliderEnabled ? (ctx.diversityLevel ?? 50) : 50;
  const headSize = Math.max(4, Math.round(24 - (level / 100) * 20));
  const head = arr.slice(0, headSize);
  const tail = shuffleWithSeed(arr.slice(headSize), personalSeed(ctx, "foryou"));
  traceStep(ctx, "assemble", { poolSize: arr.length, headSize, diversityLevel: level });
  return [...head, ...tail];
}

/** Round-robin merge preserving both inputs' relative order. */
function interleave(a: SurfaceVideo[], b: SurfaceVideo[]): SurfaceVideo[] {
  const out: SurfaceVideo[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

// Browse: category-round-robin across ALL approved categories.
export async function retrieveBrowse(ctx: SurfaceContext) {
  // Aggregate server-side: a plain `select category limit N` returns rows in
  // physical order and can yield a single category, collapsing Browse.
  const { data: cats } = await ctx.service.rpc("list_active_categories");
  const uniq = ((cats ?? []) as { category: string }[])
    .map((r) => r.category).filter(Boolean);
  const chosen = shuffleWithSeed(uniq, sessionSeed(ctx.sessionId + "brw")).slice(0, 12);
  const perCat = 4;
  const buckets: SurfaceVideo[][] = [];
  await Promise.all(chosen.map(async (c, idx) => {
    const { data } = await ctx.service
      .from("curated_videos")
      .select("video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language,visual_state")
      .in("moderation_state", ["approved", "auto_approved"])
      .eq("is_hidden", false).eq("is_archived", false)
      .eq("category", c)
      .or("visual_state.is.null,visual_state.in.(unchecked,clean)")
      .order("halal_score", { ascending: false, nullsFirst: false })
      .limit(perCat * 3);
    buckets[idx] = shuffleWithSeed(((data ?? []) as SurfaceVideo[]), sessionSeed(ctx.sessionId + c)).slice(0, perCat);
  }));
  const out: SurfaceVideo[] = [];
  for (let i = 0; i < perCat; i++) {
    for (const b of buckets) if (b?.[i]) out.push(b[i]);
  }
  return out;
}

// Listen: audio-first categories.
export async function retrieveListen(ctx: SurfaceContext) {
  const AUDIO_CATS = ["Quran", "Adhan", "Nasheeds", "Lectures", "Duas"];
  const { data } = await ctx.service
    .from("curated_videos")
    .select("video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language,visual_state")
    .in("moderation_state", ["approved", "auto_approved"])
    .eq("is_hidden", false).eq("is_archived", false)
    .in("category", AUDIO_CATS)
    .order("halal_score", { ascending: false, nullsFirst: false })
    .order("ingested_at", { ascending: false })
    .limit(240);
  return shuffleWithSeed((data ?? []) as SurfaceVideo[], sessionSeed(ctx.sessionId + "lis"));
}

export const RETRIEVERS = {
  for_you: retrieveForYou,
  browse: retrieveBrowse,
  listen: retrieveListen,
  recently_added: retrieveRecentlyAdded,
  trending: retrieveTrending,
  continue_watching: retrieveContinueWatching,
  hidden_gems: retrieveHiddenGems,
  new_channels: retrieveNewChannels,
  new_videos: retrieveNewVideos,
  because_you_watched: retrieveBecauseYouWatched,
  popular_this_week: retrievePopularWeek,
} as const;

export type SurfaceName = keyof typeof RETRIEVERS;
