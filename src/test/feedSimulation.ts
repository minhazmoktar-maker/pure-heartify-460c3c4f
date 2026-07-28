/**
 * Feed diversity simulation harness.
 *
 * Mirrors the production `for_you` assembly path using the REAL shared
 * modules that ship to the edge function:
 *   - `personalSeed`     (retrievers.ts)  — slider/user/device seed mixing
 *   - `shuffleWithSeed`  (diversity.ts)   — deterministic jitter
 *   - `enforceContract`  (diversity.ts)   — per-channel cap + dedup
 *   - `computeStats` / `checkGuarantees`  — contract validation
 *   - `CONTRACTS`        (contracts.ts)   — per-surface guarantees
 *   - `DEFAULT_FEED_CONFIG` (config.ts)   — weights + per-channel caps
 *
 * Only the database retrieval is synthetic: a deterministic corpus plus an
 * affinity-biased candidate pool per user. That keeps the test hermetic
 * while still exercising every knob that can cause a diversity collapse
 * (slider weights, head size, per-channel caps, kill switch).
 */

import {
  shuffleWithSeed,
  enforceContract,
  computeStats,
  checkGuarantees,
} from "../../supabase/functions/_shared/surfaces/diversity.ts";
import { personalSeed } from "../../supabase/functions/_shared/surfaces/retrievers.ts";
import { CONTRACTS } from "../../supabase/functions/_shared/surfaces/contracts.ts";
import {
  DEFAULT_FEED_CONFIG,
  type FeedRuntimeConfig,
} from "../../supabase/functions/_shared/surfaces/config.ts";
import type {
  SurfaceVideo,
  SurfaceContext,
} from "../../supabase/functions/_shared/surfaces/types.ts";

export const CATEGORIES = [
  "quran",
  "seerah",
  "aqeedah",
  "fiqh",
  "history",
  "science",
  "language",
  "productivity",
  "parenting",
  "dawah",
];
export const LANGUAGES = ["en", "ar", "bn", "ur", "id", "tr", "fr"];
const DEVICES = ["phone", "tablet", "desktop"];
const BROWSERS = ["chrome", "safari", "firefox", "edge"];

/** Deterministic synthetic corpus: 60 channels x N videos. */
export function buildCorpus(channels = 60, perChannel = 25): SurfaceVideo[] {
  const now = Date.now();
  const out: SurfaceVideo[] = [];
  for (let c = 0; c < channels; c++) {
    for (let i = 0; i < perChannel; i++) {
      const idx = c * perChannel + i;
      out.push({
        video_id: `v${idx}`,
        title: `Video ${idx}`,
        channel_id: `ch${c}`,
        channel_title: `Channel ${c}`,
        thumbnail_url: null,
        category: CATEGORIES[(c + i) % CATEGORIES.length],
        content_language: LANGUAGES[(c * 3 + i) % LANGUAGES.length],
        halal_score: 85 + (idx % 15),
        view_count: 1000 + ((idx * 7919) % 90000),
        published_at: new Date(now - ((idx * 13) % 60) * 86400000).toISOString(),
        ingested_at: new Date(now - ((idx * 5) % 30) * 86400000).toISOString(),
        is_trusted_channel: true,
        is_premium_only: false,
      } as SurfaceVideo);
    }
  }
  return out;
}

export interface SimUser {
  userId: string;
  sessionId: string;
  diversityLevel: number;
  deviceClass: string;
  browser: string;
  /** Channel indices this user has affinity for (drives the ranked head). */
  affinityChannels: number[];
}

/** 100 (or N) deterministic users with overlapping tastes — the worst case. */
export function buildUsers(n = 100): SimUser[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `user-${i}`,
    sessionId: `sess-${i}`,
    // Realistic spread: most users never move the slider off 50.
    diversityLevel: i % 5 === 0 ? (i * 7) % 101 : 50,
    deviceClass: DEVICES[i % DEVICES.length],
    browser: BROWSERS[i % BROWSERS.length],
    // Heavy overlap on purpose: 8 "popular" channels dominate affinity.
    affinityChannels: [
      i % 8,
      (i % 8) + 8,
      (i * 3) % 24,
      (i * 5) % 40,
      (i * 11) % 60,
    ],
  }));
}

function ctxFor(u: SimUser, config: FeedRuntimeConfig): SurfaceContext {
  return {
    userId: u.userId,
    sessionId: u.sessionId,
    isPremium: false,
    contentLanguages: [],
    kidsMode: false,
    blockedChannels: new Set<string>(),
    hiddenVideos: new Set<string>(),
    supabase: null,
    service: null,
    diversityLevel: u.diversityLevel,
    deviceClass: u.deviceClass,
    browser: u.browser,
    config,
  } as SurfaceContext;
}

/**
 * Synthetic retrieval: affinity-ranked head (identical shape for users with
 * the same popular channels) + a broad exploration tail. This is the pool
 * shape that historically produced "every user sees the same feed".
 */
function candidatePool(u: SimUser, corpus: SurfaceVideo[]): SurfaceVideo[] {
  const affinity = new Set(u.affinityChannels.map((c) => `ch${c}`));
  const head = corpus.filter((v) => affinity.has(v.channel_id!));
  const tail = corpus.filter((v) => !affinity.has(v.channel_id!));
  return [...head.slice(0, 60), ...tail.slice(0, 240)];
}

/** Mirrors `retrieveForYou`'s final assembly, then the dispatcher's contract pass. */
export function simulateForYou(
  u: SimUser,
  corpus: SurfaceVideo[],
  config: FeedRuntimeConfig = DEFAULT_FEED_CONFIG,
) {
  const ctx = ctxFor(u, config);
  const pool = candidatePool(u, corpus);

  const level = config.sliderEnabled ? u.diversityLevel : 50;
  const headSize = Math.max(4, Math.round(24 - (level / 100) * 20));
  const head = pool.slice(0, headSize);
  const tail = shuffleWithSeed(pool.slice(headSize), personalSeed(ctx, "foryou"));
  const assembled = [...head, ...tail];

  // Dispatcher: slider raises/lowers the per-channel cap within the contract.
  const contract = CONTRACTS.for_you;
  const cap =
    level >= 70
      ? config.perChannelCap.high
      : level >= 35
        ? config.perChannelCap.mid
        : config.perChannelCap.low;
  const effective = {
    ...contract,
    maxPerChannel: Math.min(contract.maxPerChannel + 1, cap),
  };

  const items = enforceContract(assembled, effective);
  const stats = computeStats(items, effective);
  const guarantees = checkGuarantees(items, effective, stats);
  return { items, stats, guarantees, contract: effective, poolSize: pool.length };
}

export interface DiversityReport {
  users: number;
  meanItems: number;
  minItems: number;
  identicalFeedPairs: number;
  meanPairwiseOverlap: number;
  maxPairwiseOverlap: number;
  duplicatesWithinFeed: number;
  maxChannelShare: number;
  guaranteeFailures: Record<string, number>;
  /** Share of the whole corpus surfaced across all users (catalog coverage). */
  catalogCoverage: number;
}

/** Runs the simulation for every user and aggregates collapse indicators. */
export function runSimulation(
  users: SimUser[],
  corpus: SurfaceVideo[],
  config: FeedRuntimeConfig = DEFAULT_FEED_CONFIG,
): DiversityReport {
  const feeds: string[][] = [];
  const guaranteeFailures: Record<string, number> = {};
  let duplicatesWithinFeed = 0;
  let maxChannelShare = 0;
  const covered = new Set<string>();

  for (const u of users) {
    const { items, guarantees } = simulateForYou(u, corpus, config);
    const ids = items.map((v) => v.video_id);
    feeds.push(ids);
    ids.forEach((id) => covered.add(id));
    duplicatesWithinFeed += ids.length - new Set(ids).size;

    const perChannel = new Map<string, number>();
    for (const v of items) {
      const c = v.channel_id ?? "_unknown";
      perChannel.set(c, (perChannel.get(c) ?? 0) + 1);
    }
    if (ids.length) {
      maxChannelShare = Math.max(
        maxChannelShare,
        Math.max(...perChannel.values()) / ids.length,
      );
    }
    for (const [k, ok] of Object.entries(guarantees)) {
      if (!ok) guaranteeFailures[k] = (guaranteeFailures[k] ?? 0) + 1;
    }
  }

  let pairs = 0;
  let overlapSum = 0;
  let maxOverlap = 0;
  let identical = 0;
  for (let i = 0; i < feeds.length; i++) {
    const a = new Set(feeds[i]);
    for (let j = i + 1; j < feeds.length; j++) {
      const b = feeds[j];
      const shared = b.filter((id) => a.has(id)).length;
      const denom = Math.max(1, Math.min(a.size, b.length));
      const overlap = shared / denom;
      overlapSum += overlap;
      maxOverlap = Math.max(maxOverlap, overlap);
      if (overlap === 1 && a.size === b.length) identical++;
      pairs++;
    }
  }

  const sizes = feeds.map((f) => f.length);
  return {
    users: users.length,
    meanItems: sizes.reduce((s, n) => s + n, 0) / (sizes.length || 1),
    minItems: Math.min(...sizes),
    identicalFeedPairs: identical,
    meanPairwiseOverlap: pairs ? overlapSum / pairs : 0,
    maxPairwiseOverlap: maxOverlap,
    duplicatesWithinFeed,
    maxChannelShare,
    guaranteeFailures,
    catalogCoverage: covered.size / corpus.length,
  };
}
