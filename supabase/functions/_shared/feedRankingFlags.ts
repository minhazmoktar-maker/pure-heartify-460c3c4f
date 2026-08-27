/**
 * Runtime feed-ranking knobs.
 *
 * The feed pipeline's tuning constants (exploration, fatigue detection,
 * personalization mix, semantic dedup) live in `public.feed_ranking_flags` so
 * they can be rolled out, dialled back, or killed from /admin/feed-flags
 * without a deploy. Values are read through a short in-process TTL cache so a
 * hot feed isolate pays at most one extra query per minute.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { cacheGet, cacheSet } from "./cache.ts";

export type FeedRankingFlags = {
  /** Share of every page reserved for exploratory / long-tail picks. */
  explorationRate: number;
  /** Base temperature for the stochastic (Gumbel) ranking. */
  explorationTemperature: number;
  /** Whether repeat-impression penalties apply at all. */
  fatigueDetection: boolean;
  /** Multiplier on the repeat-impression penalty. */
  fatiguePenaltyWeight: number;
  /** Weight applied to affinity / interest signals vs. freshness. */
  personalizationMix: number;
  /** Serve only the canonical row of each near-duplicate group. */
  semanticDedup: boolean;
};

export const DEFAULT_FEED_RANKING_FLAGS: FeedRankingFlags = {
  explorationRate: 0.2,
  explorationTemperature: 0.85,
  fatigueDetection: true,
  fatiguePenaltyWeight: 1,
  personalizationMix: 1,
  semanticDedup: true,
};

const CACHE_KEY = "feed_ranking_flags:v1";
const TTL_SECONDS = 60;

type Row = { key: string; enabled: boolean; value: number | string | null };

function pick(rows: Map<string, Row>, key: string, fallback: number): number {
  const row = rows.get(key);
  if (!row || row.enabled === false) return fallback;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
}

function pickBool(rows: Map<string, Row>, key: string, fallback: boolean): boolean {
  const row = rows.get(key);
  if (!row) return fallback;
  // A knob is on only when the flag itself is enabled AND its value is > 0,
  // so admins can disable it either way (kill-switch or slider to zero).
  return row.enabled !== false && Number(row.value) > 0;
}

/** Map raw rows to the typed knob set. Exported for tests. */
export function mapFeedRankingFlags(rows: Row[]): FeedRankingFlags {
  const byKey = new Map<string, Row>(rows.map((r) => [r.key, r]));
  const d = DEFAULT_FEED_RANKING_FLAGS;
  return {
    explorationRate: Math.min(Math.max(pick(byKey, "exploration_rate", d.explorationRate), 0), 0.6),
    explorationTemperature: Math.min(
      Math.max(pick(byKey, "exploration_temperature", d.explorationTemperature), 0.1),
      2,
    ),
    fatigueDetection: pickBool(byKey, "fatigue_detection", d.fatigueDetection),
    fatiguePenaltyWeight: Math.min(
      Math.max(pick(byKey, "fatigue_penalty_weight", d.fatiguePenaltyWeight), 0),
      3,
    ),
    personalizationMix: Math.min(Math.max(pick(byKey, "personalization_mix", d.personalizationMix), 0), 2),
    semanticDedup: pickBool(byKey, "semantic_dedup", d.semanticDedup),
  };
}

export async function loadFeedRankingFlags(admin: SupabaseClient): Promise<FeedRankingFlags> {
  const cached = cacheGet<FeedRankingFlags>(CACHE_KEY);
  if (cached) return cached;
  try {
    const { data, error } = await admin
      .from("feed_ranking_flags")
      .select("key,enabled,value");
    if (error) throw new Error(error.message);
    const flags = mapFeedRankingFlags((data ?? []) as Row[]);
    cacheSet(CACHE_KEY, flags, TTL_SECONDS);
    return flags;
  } catch (e) {
    console.warn("[feedRankingFlags] falling back to defaults:", (e as Error).message);
    // Cache the fallback briefly so a flapping table cannot stampede the feed.
    cacheSet(CACHE_KEY, DEFAULT_FEED_RANKING_FLAGS, 15);
    return DEFAULT_FEED_RANKING_FLAGS;
  }
}
