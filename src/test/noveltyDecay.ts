/**
 * Novelty-decay simulation harness.
 *
 * Answers the one question the product lives or dies on: "if I open Heartify
 * again — 5, 10, 40 times — do I keep seeing new beneficial content, or does
 * the feed collapse into the same rows?"
 *
 * Unlike `feedSimulation.ts` (which models the `for_you` surface contract),
 * this harness models the **serving pipeline of `supabase/functions/feed`**
 * across *repeated refreshes inside one session*, exercising the three stages
 * that can silently break novelty:
 *
 *   1. `feed_exposures` accumulation  → repetition/fatigue penalty
 *      (real `impressionPenalty` curve from `recommendations/rerankV3.ts`)
 *   2. semantic near-duplicate collapse
 *      (real `collapseDuplicateGroups` from `recommendations/semanticDedup.ts`)
 *   3. Gumbel exploration sampling with the runtime ranking knobs
 *      (`exploration_temperature`, `fatigue_penalty_weight`, …)
 *
 * Everything is deterministic and dependency-free, so it runs in CI as a
 * regression gate rather than as a one-off script.
 */

import { collapseDuplicateGroups } from "../../supabase/functions/_shared/recommendations/semanticDedup.ts";
import { impressionPenalty } from "../../supabase/functions/_shared/recommendations/rerankV3.ts";

/** FNV-1a → deterministic [0,1). Identical to the feed function's hash01. */
function hash01(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export interface SimItem {
  video_id: string;
  channel_id: string;
  category: string;
  duplicate_group_id: string;
  is_trusted_channel: boolean;
  halal_score: number;
  view_count: number;
  /** Static quality prior, standing in for freshness + halal score. */
  base: number;
}

/**
 * Deterministic corpus with a realistic duplicate-group tail: ~15% of rows are
 * re-uploads that share a `duplicate_group_id` with an earlier row.
 */
export function buildDedupCorpus(channels = 140, perChannel = 40): SimItem[] {
  const cats = ["quran", "seerah", "aqeedah", "fiqh", "history", "science", "language", "dawah"];
  const total = channels * perChannel;
  const distinctGroups = Math.round(total * 0.85);
  const out: SimItem[] = [];
  for (let c = 0; c < channels; c++) {
    for (let i = 0; i < perChannel; i++) {
      const idx = c * perChannel + i;
      out.push({
        video_id: `v${idx}`,
        channel_id: `ch${c}`,
        category: cats[(c + i) % cats.length],
        duplicate_group_id: `g${idx % distinctGroups}`,
        is_trusted_channel: idx % 4 !== 0,
        halal_score: 82 + (idx % 18),
        view_count: 500 + ((idx * 7919) % 250000),
        base: 0.4 + hash01(`base:${idx}`) * 0.6,
      });
    }
  }
  return out;
}

export interface NoveltyKnobs {
  explorationTemperature: number;
  explorationRate: number;
  fatigueDetection: boolean;
  fatiguePenaltyWeight: number;
  personalizationMix: number;
  semanticDedup: boolean;
}

export const DEFAULT_KNOBS: NoveltyKnobs = {
  explorationTemperature: 0.85,
  explorationRate: 0.2,
  fatigueDetection: true,
  fatiguePenaltyWeight: 1,
  personalizationMix: 1,
  semanticDedup: true,
};

interface ExposureState {
  /** video_id → seen_count, mirroring `feed_impressions.seen_count`. */
  seen: Map<string, number>;
  /** groups already served in this session, mirroring `feed_exposures`. */
  groups: Set<string>;
}

/**
 * One feed page for one session refresh. Mirrors the production order:
 * eligibility → dedup → fatigue penalty → personalization → Gumbel
 * exploration → per-channel cap → final dedup.
 */
export function serveFeedPage(
  sessionKey: string,
  refresh: number,
  corpus: SimItem[],
  state: ExposureState,
  affinityChannels: Set<string>,
  limit = 24,
  knobs: NoveltyKnobs = DEFAULT_KNOBS,
): SimItem[] {
  const rotationKey = `${sessionKey}:r${refresh}`;

  const scored = corpus
    .map((v) => {
      const seen = state.seen.get(v.video_id) ?? 0;
      const [rawPen, rawHide] = impressionPenalty(
        seen ? { video_id: v.video_id, seen_count: seen, last_seen_at: "", last_action: null } as never : undefined,
      );
      const pen = knobs.fatigueDetection ? rawPen * knobs.fatiguePenaltyWeight : 0;
      const hardHide = knobs.fatigueDetection && rawHide;
      const aff = affinityChannels.has(v.channel_id) ? 0.85 * knobs.personalizationMix : 0;
      const score = v.base + aff - pen;
      const signalStrength = Math.min(1, aff / 0.85);
      const temp = Math.max(0.05, knobs.explorationTemperature - 0.5 * signalStrength);
      const u = Math.max(1e-9, hash01(`${rotationKey}:${v.video_id}`));
      return { v, hardHide, gate: score, k: -(score - temp * Math.log(-Math.log(u))) };
    })
    .filter((x) => !x.hardHide)
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);

  const pool = knobs.semanticDedup
    ? collapseDuplicateGroups(scored, { alreadyServedGroups: state.groups }).items
    : scored;

  // Per-channel cap (max 3 per page) — same contract the dispatcher enforces.
  const perChannel = new Map<string, number>();
  const page: SimItem[] = [];
  for (const v of pool) {
    if (page.length >= limit) break;
    const n = perChannel.get(v.channel_id) ?? 0;
    if (n >= 3) continue;
    perChannel.set(v.channel_id, n + 1);
    page.push(v);
  }

  // Persist exposures exactly like `recordFeedServe` does server-side.
  for (const v of page) {
    state.seen.set(v.video_id, (state.seen.get(v.video_id) ?? 0) + 1);
    if (knobs.semanticDedup) state.groups.add(v.duplicate_group_id);
  }
  return page;
}

export interface NoveltyDecayReport {
  sessions: number;
  refreshes: number;
  /** Mean share of brand-new videos per refresh index (index 0 is always 1). */
  noveltyByRefresh: number[];
  /** Lowest per-refresh mean novelty across the whole run. */
  minMeanNovelty: number;
  /** Any duplicate video_id inside a single page (must be 0). */
  duplicatesWithinPage: number;
  /** Any duplicate_group_id served twice within one session (must be 0). */
  repeatedGroupsWithinSession: number;
  /** Mean pairwise overlap between two *different* sessions' first pages. */
  crossSessionOverlap: number;
  /** Share of the corpus surfaced across all sessions. */
  catalogCoverage: number;
  /** Mean page size — a collapsing pipeline shows up as short pages. */
  meanPageSize: number;
}

export function runNoveltyDecay(
  sessions = 1000,
  refreshes = 10,
  corpus = buildDedupCorpus(),
  knobs: NoveltyKnobs = DEFAULT_KNOBS,
): NoveltyDecayReport {
  const noveltySums = new Array(refreshes).fill(0);
  const covered = new Set<string>();
  const firstPages: string[][] = [];
  let duplicatesWithinPage = 0;
  let repeatedGroupsWithinSession = 0;
  let pageSizeSum = 0;
  let pages = 0;

  for (let s = 0; s < sessions; s++) {
    const sessionKey = `sess-${s}`;
    const state: ExposureState = { seen: new Map(), groups: new Set() };
    const affinity = new Set([`ch${s % 8}`, `ch${(s * 3) % 40}`, `ch${(s * 7) % 140}`]);
    const seenEver = new Set<string>();
    const groupsEver = new Set<string>();

    for (let r = 0; r < refreshes; r++) {
      const page = serveFeedPage(sessionKey, r, corpus, state, affinity, 24, knobs);
      const ids = page.map((v) => v.video_id);
      duplicatesWithinPage += ids.length - new Set(ids).size;

      let fresh = 0;
      for (const v of page) {
        if (!seenEver.has(v.video_id)) fresh++;
        seenEver.add(v.video_id);
        covered.add(v.video_id);
        if (knobs.semanticDedup) {
          if (groupsEver.has(v.duplicate_group_id)) repeatedGroupsWithinSession++;
          groupsEver.add(v.duplicate_group_id);
        }
      }
      noveltySums[r] += ids.length ? fresh / ids.length : 0;
      pageSizeSum += ids.length;
      pages++;
      if (r === 0 && s % Math.max(1, Math.floor(sessions / 60)) === 0) firstPages.push(ids);
    }
  }

  let overlapSum = 0;
  let pairs = 0;
  for (let i = 0; i < firstPages.length; i++) {
    const a = new Set(firstPages[i]);
    for (let j = i + 1; j < firstPages.length; j++) {
      const shared = firstPages[j].filter((id) => a.has(id)).length;
      overlapSum += shared / Math.max(1, Math.min(a.size, firstPages[j].length));
      pairs++;
    }
  }

  const noveltyByRefresh = noveltySums.map((n) => n / sessions);
  return {
    sessions,
    refreshes,
    noveltyByRefresh,
    minMeanNovelty: Math.min(...noveltyByRefresh),
    duplicatesWithinPage,
    repeatedGroupsWithinSession,
    crossSessionOverlap: pairs ? overlapSum / pairs : 0,
    catalogCoverage: covered.size / corpus.length,
    meanPageSize: pages ? pageSizeSum / pages : 0,
  };
}
