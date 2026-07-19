// Per-surface diversity + freshness contracts. Single source of truth.
// Any retriever with a mismatched contract is rejected at load time.

import type { SurfaceContract } from "./types.ts";

export const CONTRACTS: Record<string, SurfaceContract> = {
  for_you: {
    name: "for_you",
    minItems: 12, maxItems: 24, maxPerChannel: 2,
    minDistinctChannels: 8, minDistinctCategories: 4,
    minDistinctLanguages: 2, maxTopLanguageShare: 0.6,
    minFreshShare: 0.25, freshWindowDays: 14,
    anonAllowed: false, requiresAuth: true,
  },
  browse: {
    name: "browse",
    minItems: 16, maxItems: 30, maxPerChannel: 1,
    minDistinctChannels: 12, minDistinctCategories: 6,
    minDistinctLanguages: 2,
    anonAllowed: true,
  },
  listen: {
    name: "listen",
    minItems: 12, maxItems: 24, maxPerChannel: 1,
    minDistinctChannels: 6, minDistinctCategories: 2,
    anonAllowed: true,
  },
  recently_added: {
    name: "recently_added",
    minItems: 8, maxItems: 30, maxPerChannel: 1,
    minDistinctChannels: 5,
    minFreshShare: 0.5, freshWindowDays: 7,
    anonAllowed: true,
  },
  trending: {
    name: "trending",
    minItems: 12, maxItems: 24, maxPerChannel: 2,
    minDistinctChannels: 6, minDistinctCategories: 3,
    anonAllowed: true,
  },
  continue_watching: {
    name: "continue_watching",
    minItems: 1, maxItems: 12, maxPerChannel: 3,
    minDistinctChannels: 1,
    requiresAuth: true,
  },
  hidden_gems: {
    name: "hidden_gems",
    minItems: 6, maxItems: 20, maxPerChannel: 1,
    minDistinctChannels: 6, minDistinctCategories: 3,
    anonAllowed: true,
  },
  new_channels: {
    name: "new_channels",
    minItems: 4, maxItems: 20, maxPerChannel: 1,
    minDistinctChannels: 4,
    anonAllowed: true,
  },
  new_videos: {
    name: "new_videos",
    minItems: 8, maxItems: 24, maxPerChannel: 2,
    minDistinctChannels: 5,
    minFreshShare: 0.6, freshWindowDays: 7,
    anonAllowed: true,
  },
  because_you_watched: {
    name: "because_you_watched",
    minItems: 6, maxItems: 20, maxPerChannel: 1,
    minDistinctChannels: 6,
    requiresAuth: true,
  },
  popular_this_week: {
    name: "popular_this_week",
    minItems: 10, maxItems: 24, maxPerChannel: 2,
    minDistinctChannels: 6,
    anonAllowed: true,
  },
};

export type SurfaceName = keyof typeof CONTRACTS;
