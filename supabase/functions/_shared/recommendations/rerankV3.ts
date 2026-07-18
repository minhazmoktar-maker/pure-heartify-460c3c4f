/**
 * Recommendation v3 rerank helpers.
 *
 * Layered on top of the freshness-sorted candidate page produced by the
 * feed edge function. All halal invariants come from upstream filters
 * (blocked creators, premium gate, moderation status) — this module only
 * *reorders* and applies decay/diversity/freshness/exploration on top.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ImpressionRow {
  video_id: string;
  seen_count: number;
  last_seen_at: string;
  last_action: string | null;
}

/** Load the caller's recent (≤48h) impression memory. Keyed by video_id. */
export async function loadImpressions(
  admin: SupabaseClient,
  userId: string,
): Promise<Map<string, ImpressionRow>> {
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data } = await admin
    .from("feed_impressions")
    .select("video_id, seen_count, last_seen_at, last_action")
    .eq("user_id", userId)
    .gte("last_seen_at", cutoff)
    .limit(2000);
  const m = new Map<string, ImpressionRow>();
  for (const r of (data ?? []) as ImpressionRow[]) m.set(r.video_id, r);
  return m;
}

/** Impression decay curve. Returns [penalty, hardHide]. */
export function impressionPenalty(imp: ImpressionRow | undefined): [number, boolean] {
  if (!imp) return [0, 0 as unknown as boolean] as [number, boolean];
  // Positive action recently → treat as fresh (0 penalty)
  if (
    imp.last_action &&
    ["watch", "complete", "save", "share", "follow", "rewatch"].includes(imp.last_action)
  ) {
    return [0, false];
  }
  const n = imp.seen_count;
  if (n >= 8) return [10, true];
  const curve: Record<number, number> = { 1: 0.05, 2: 0.15, 3: 0.35, 4: 0.5, 5: 0.65, 6: 0.85, 7: 1.1 };
  return [curve[n] ?? 0, false];
}

/** Freshness boost: `exp(-hours_since / 72)` for last 30 days. */
export function freshnessScore(publishedOrIngested: string | null | undefined): number {
  if (!publishedOrIngested) return 0;
  const hours = (Date.now() - new Date(publishedOrIngested).getTime()) / 3600_000;
  if (hours < 0 || hours > 30 * 24) return 0;
  return Math.exp(-hours / 72);
}

/** Fetch the owner-configurable pool mix (falls back to defaults). */
export async function loadPoolMix(
  admin: SupabaseClient,
): Promise<Record<string, number>> {
  const defaults = {
    recently_added: 0.2,
    deep_personal: 0.35,
    trending: 0.15,
    hidden_gems: 0.1,
    continue: 0.1,
    rediscovery: 0.05,
    exploration: 0.05,
  };
  try {
    const { data } = await admin
      .from("_internal_config")
      .select("value")
      .eq("key", "reco_pool_mix")
      .maybeSingle();
    if (data?.value && typeof data.value === "object") {
      return { ...defaults, ...(data.value as Record<string, number>) };
    }
  } catch { /* ignore */ }
  return defaults;
}

/**
 * MMR-style diversity: greedy pick that avoids repeating the immediately
 * previous creator or category. Preserves original ordering when no better
 * alternative exists within the lookahead window.
 */
export function alternateByCreatorAndCategory<T extends Record<string, unknown>>(
  items: T[],
  windowSize = 6,
): T[] {
  const result: T[] = [];
  const remaining = [...items];
  let prevChannel: string | null = null;
  let prevCategory: string | null = null;

  while (remaining.length > 0) {
    let pickIdx = 0;
    // Look for a candidate in the next `windowSize` that avoids both prev keys.
    for (let i = 0; i < Math.min(windowSize, remaining.length); i++) {
      const it = remaining[i];
      const ch = (it.channel_title as string) ?? "";
      const ct = (it.category as string) ?? "";
      if (ch !== prevChannel && ct !== prevCategory) {
        pickIdx = i;
        break;
      }
      if (ch !== prevChannel) pickIdx = i; // fallback: at least break channel repeat
    }
    const chosen = remaining.splice(pickIdx, 1)[0];
    result.push(chosen);
    prevChannel = (chosen.channel_title as string) ?? null;
    prevCategory = (chosen.category as string) ?? null;
  }
  return result;
}

/**
 * Sprinkle exploration items (trusted-channel candidates the user has *never*
 * seen from creators outside their sessionChannelIds) at fixed cadence.
 */
export function sprinkleExploration<T extends Record<string, unknown>>(
  ranked: T[],
  explorationPool: T[],
  rate = 0.05,
): T[] {
  if (explorationPool.length === 0 || rate <= 0) return ranked;
  const cadence = Math.max(4, Math.round(1 / rate));
  const out: T[] = [];
  let ei = 0;
  for (let i = 0; i < ranked.length; i++) {
    out.push(ranked[i]);
    if ((i + 1) % cadence === 0 && ei < explorationPool.length) {
      const cand = explorationPool[ei++];
      // Avoid dup
      const id = (cand.video_id as string) ?? "";
      if (id && !out.some((x) => (x.video_id as string) === id)) {
        out.push(cand);
      }
    }
  }
  return out;
}
