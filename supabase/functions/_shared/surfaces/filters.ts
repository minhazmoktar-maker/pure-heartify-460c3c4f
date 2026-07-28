// Universal post-fetch filters. Applied in order:
//   applyStrictHalal -> applyBlocklist -> applyUserBlocks -> applyHiddenVideos ->
//   applyKidsMode -> applyLanguagePreference -> applyImpressionPenalty
//
// These run AFTER the retriever's candidate SQL and BEFORE its own ranker.

import type { SurfaceVideo, SurfaceContext } from "./types.ts";
import { assessStrict } from "../halalGuard.ts";

const BLOCKED_TOKENS = ["music video", "official music", "official audio", "trailer"];

/**
 * Last-mile halal gate. Tier-1 terms are removed for every user; tier-2
 * terms only when Strict Halal is on (the default). Nothing downstream can
 * re-introduce a removed item.
 */
export function applyStrictHalal(items: SurfaceVideo[], ctx: SurfaceContext): SurfaceVideo[] {
  const strict = ctx.strictHalal !== false;
  return items.filter((v) => assessStrict(v as never, strict).allowed);
}

/**
 * Language preference. Hard-preferred: when the user picked content
 * languages we keep only matching rows (unknown language counts as a match
 * so unlabeled catalog never disappears). If that leaves too little to fill
 * a surface, we fall back to the unfiltered set rather than showing an
 * empty rail.
 */
export function applyLanguagePreference(items: SurfaceVideo[], ctx: SurfaceContext): SurfaceVideo[] {
  const langs = (ctx.contentLanguages ?? []).filter(Boolean);
  if (!langs.length) return items;
  const set = new Set(langs.map((l) => l.toLowerCase()));
  const matched = items.filter((v) => {
    const l = (v.content_language ?? "").toLowerCase();
    return !l || set.has(l);
  });
  if (matched.length >= 12) return matched;
  // Too thin — keep matches first, then top up with the rest.
  const have = new Set(matched.map((v) => v.video_id));
  return [...matched, ...items.filter((v) => !have.has(v.video_id))];
}

export function applyBlocklist(items: SurfaceVideo[]): SurfaceVideo[] {
  return items.filter((v) => {
    const t = (v.title ?? "").toLowerCase();
    return !BLOCKED_TOKENS.some((tok) => t.includes(tok));
  });
}


export function applyUserBlocks(items: SurfaceVideo[], ctx: SurfaceContext): SurfaceVideo[] {
  if (!ctx.blockedChannels.size) return items;
  return items.filter((v) => !v.channel_id || !ctx.blockedChannels.has(v.channel_id));
}

export function applyHiddenVideos(items: SurfaceVideo[], ctx: SurfaceContext): SurfaceVideo[] {
  if (!ctx.hiddenVideos.size) return items;
  return items.filter((v) => !ctx.hiddenVideos.has(v.video_id));
}

export function applyKidsMode(items: SurfaceVideo[], ctx: SurfaceContext): SurfaceVideo[] {
  if (!ctx.kidsMode) return items;
  // In kids mode require trusted channel AND halal_score >= 90.
  return items.filter(
    (v) => v.is_trusted_channel === true && (v.halal_score ?? 0) >= 90,
  );
}

export function applyPremiumGate(items: SurfaceVideo[], ctx: SurfaceContext): SurfaceVideo[] {
  if (ctx.isPremium) return items;
  return items.filter((v) => v.is_premium_only !== true);
}

export async function loadImpressions(ctx: SurfaceContext): Promise<Map<string, number>> {
  if (!ctx.userId) return new Map();
  try {
    const { data } = await ctx.service
      .from("feed_impressions")
      .select("video_id, seen_count, last_action")
      .eq("user_id", ctx.userId)
      .gte("last_seen_at", new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString())
      .limit(2000);
    const m = new Map<string, number>();
    for (const r of data ?? []) {
      const seen = Number((r as any).seen_count ?? 0);
      const dismissed = (r as any).last_action === "dismiss";
      m.set((r as any).video_id, dismissed ? 999 : seen);
    }
    return m;
  } catch {
    return new Map();
  }
}

// Removes items already dismissed and heavily-seen (seen>=5).
export function applyImpressionFilter(
  items: SurfaceVideo[],
  impressions: Map<string, number>,
): SurfaceVideo[] {
  if (!impressions.size) return items;
  return items.filter((v) => (impressions.get(v.video_id) ?? 0) < 5);
}

export function runUniversalFilters(
  items: SurfaceVideo[],
  ctx: SurfaceContext,
  impressions: Map<string, number>,
): SurfaceVideo[] {
  return applyImpressionFilter(
    applyKidsMode(
      applyHiddenVideos(applyUserBlocks(applyPremiumGate(applyBlocklist(items), ctx), ctx), ctx),
      ctx,
    ),
    impressions,
  );
}
