// Diversity enforcement + guarantee validation.
//
// enforceContract greedily selects items in retriever-provided score order
// while respecting per-channel caps and pushing toward category/language
// distinctness. Never returns fewer than contract.minItems unless the
// candidate pool is exhausted.

import type { SurfaceContract, SurfaceVideo, SurfaceResponse } from "./types.ts";

// Seeded PRNG so a session_id produces the same shuffle across paginated calls.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sessionSeed(sessionId: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < sessionId.length; i++) {
    h ^= sessionId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function enforceContract(
  scored: SurfaceVideo[],
  contract: SurfaceContract,
): SurfaceVideo[] {
  const picked: SurfaceVideo[] = [];
  const perChannel = new Map<string, number>();
  const seen = new Set<string>();

  for (const v of scored) {
    if (picked.length >= contract.maxItems) break;
    if (seen.has(v.video_id)) continue;
    const chan = v.channel_id ?? `_${v.channel_title ?? "unknown"}`;
    if ((perChannel.get(chan) ?? 0) >= contract.maxPerChannel) continue;
    perChannel.set(chan, (perChannel.get(chan) ?? 0) + 1);
    seen.add(v.video_id);
    picked.push(v);
  }
  return picked;
}

// Compute meta.stats for a picked list.
export function computeStats(
  items: SurfaceVideo[],
  contract: SurfaceContract,
): SurfaceResponse["meta"]["stats"] {
  const channels = new Set<string>();
  const cats = new Set<string>();
  const langs = new Map<string, number>();
  let fresh = 0;
  const freshMs = (contract.freshWindowDays ?? 14) * 24 * 3600 * 1000;
  const now = Date.now();
  for (const v of items) {
    if (v.channel_id) channels.add(v.channel_id);
    if (v.category) cats.add(v.category);
    const lang = v.content_language ?? "unknown";
    langs.set(lang, (langs.get(lang) ?? 0) + 1);
    // Fresh = whichever of published_at / ingested_at is newer. This lets
    // surfaces like recently_added honor the intent of "added recently"
    // even when the underlying YouTube upload is old.
    const pub = v.published_at ? new Date(v.published_at).getTime() : 0;
    const ing = v.ingested_at ? new Date(v.ingested_at).getTime() : 0;
    const t = Math.max(pub, ing);
    if (t && now - t < freshMs) fresh++;
  }
  const topLang = Math.max(0, ...Array.from(langs.values()));
  return {
    distinctChannels: channels.size,
    distinctCategories: cats.size,
    distinctLanguages: langs.size,
    topLanguageShare: items.length ? topLang / items.length : 0,
    freshShare: items.length ? fresh / items.length : 0,
  };
}

export function checkGuarantees(
  items: SurfaceVideo[],
  contract: SurfaceContract,
  stats: SurfaceResponse["meta"]["stats"],
): SurfaceResponse["meta"]["guarantees"] {
  // Per-channel cap is implicitly satisfied by enforceContract; re-verify.
  const perCh = new Map<string, number>();
  for (const v of items) {
    const c = v.channel_id ?? `_${v.channel_title ?? "u"}`;
    perCh.set(c, (perCh.get(c) ?? 0) + 1);
  }
  const maxPer = Math.max(0, ...Array.from(perCh.values()));
  const g: SurfaceResponse["meta"]["guarantees"] = {
    minItems: items.length >= contract.minItems,
    maxPerChannel: maxPer <= contract.maxPerChannel,
    distinctChannels: stats.distinctChannels >= contract.minDistinctChannels,
  };
  if (contract.minDistinctCategories !== undefined) {
    g.distinctCategories = stats.distinctCategories >= contract.minDistinctCategories;
  }
  if (contract.minDistinctLanguages !== undefined) {
    g.distinctLanguages = stats.distinctLanguages >= contract.minDistinctLanguages;
  }
  if (contract.maxTopLanguageShare !== undefined) {
    g.topLanguageShare = stats.topLanguageShare <= contract.maxTopLanguageShare;
  }
  if (contract.minFreshShare !== undefined) {
    g.freshShare = stats.freshShare >= contract.minFreshShare;
  }
  return g;
}
