// Per-surface retrievers. Each function OWNS its candidate SQL and its
// scoring. They never call one another. Universal filters (blocklist,
// impressions, kids-mode, premium gate) are applied by the dispatcher.

import type { SurfaceVideo, SurfaceContext } from "./types.ts";
import { shuffleWithSeed, sessionSeed } from "./diversity.ts";

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

// For You v2: personalized against user_taste_profiles. On profile hit,
// pool_for_you_v2 scores every approved video by topic + creator + language
// affinity so two users with different histories get materially different
// pools. Falls back to legacy category heuristic for cold-start users
// (< 3 signals) and always blends in a small "explore" slot.
export async function retrieveForYou(ctx: SurfaceContext) {
  if (!ctx.userId) return [];

  // Kick a background refresh so the next request reflects new activity.
  ctx.service.rpc("refresh_user_taste_profile", { _user_id: ctx.userId })
    .then(({ error }) => { if (error) console.warn("[for_you] refresh error", error.message); });

  const { data: profile } = await ctx.service
    .from("user_taste_profiles").select("signal_count").eq("user_id", ctx.userId).maybeSingle();
  const warm = ((profile as any)?.signal_count ?? 0) >= 3;

  let personalized: SurfaceVideo[] = [];
  if (warm) {
    personalized = await callPool(ctx, "pool_for_you_v2", {
      _user_id: ctx.userId, _limit: 160, _exclude_premium: !ctx.isPremium,
    });
  } else {
    // Cold-start fallback (unchanged legacy path)
    const { data: hist } = await ctx.service
      .from("watch_history").select("video_id")
      .eq("user_id", ctx.userId)
      .gte("watched_at", new Date(Date.now() - 30 * 86400 * 1000).toISOString())
      .limit(50);
    const seedIds = (hist ?? []).map((r: any) => r.video_id);
    let topCats: string[] = [];
    if (seedIds.length) {
      const { data: seedRows } = await ctx.service
        .from("curated_videos").select("category").in("video_id", seedIds).limit(50);
      const bag = new Map<string, number>();
      for (const r of seedRows ?? []) {
        const c = (r as any).category;
        if (c) bag.set(c, (bag.get(c) ?? 0) + 1);
      }
      topCats = Array.from(bag.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
    }
    if (topCats.length) {
      const { data } = await ctx.service
        .from("curated_videos")
        .select("video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language")
        .in("moderation_state", ["approved", "auto_approved"])
        .eq("is_hidden", false).eq("is_archived", false)
        .in("category", topCats)
        .gte("published_at", new Date(Date.now() - 90 * 86400 * 1000).toISOString())
        .order("ingested_at", { ascending: false })
        .limit(120);
      personalized = (data ?? []) as SurfaceVideo[];
    }
  }

  // Exploration slot: small dose of fresh content so drift is possible.
  const explore = await callPool(ctx, "pool_recently_added", {
    _limit: 20, _window_hours: 72, _exclude_premium: !ctx.isPremium,
  });
  const merged = [...personalized, ...explore];
  const dedup = new Map<string, SurfaceVideo>();
  for (const v of merged) if (!dedup.has(v.video_id)) dedup.set(v.video_id, v);
  // Preserve ranked order for the personalized head; only jitter the tail.
  const arr = Array.from(dedup.values());
  const head = arr.slice(0, 20);
  const tail = shuffleWithSeed(arr.slice(20), sessionSeed(ctx.sessionId + (ctx.userId ?? "")));
  return [...head, ...tail];
}

// Browse: category-round-robin across ALL approved categories.
export async function retrieveBrowse(ctx: SurfaceContext) {
  const { data: cats } = await ctx.service
    .from("curated_videos").select("category")
    .in("moderation_state", ["approved", "auto_approved"])
    .eq("is_hidden", false).eq("is_archived", false)
    .not("category", "is", null)
    .limit(1000);
  const uniq = Array.from(new Set((cats ?? []).map((r: any) => r.category).filter(Boolean))) as string[];
  const chosen = shuffleWithSeed(uniq, sessionSeed(ctx.sessionId + "brw")).slice(0, 12);
  const perCat = 4;
  const buckets: SurfaceVideo[][] = [];
  await Promise.all(chosen.map(async (c, idx) => {
    const { data } = await ctx.service
      .from("curated_videos")
      .select("video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language")
      .in("moderation_state", ["approved", "auto_approved"])
      .eq("is_hidden", false).eq("is_archived", false)
      .eq("category", c)
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
    .select("video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language")
    .in("moderation_state", ["approved", "auto_approved"])
    .eq("is_hidden", false).eq("is_archived", false)
    .in("category", AUDIO_CATS)
    .order("halal_score", { ascending: false, nullsFirst: false })
    .order("ingested_at", { ascending: false })
    .limit(120);
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
