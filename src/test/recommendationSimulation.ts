/**
 * 1,000-user recommendation-quality simulation.
 *
 * Layers the production language-relevance resolution and per-language
 * balancing on top of the existing `for_you` assembly harness
 * (`feedSimulation.ts`, which uses the real shared surface modules), then adds
 * the personalization signals the ranker consumes in production: interests,
 * creator affinity, watch history, negative feedback and exploration appetite.
 *
 * Nothing here re-implements ranking for its own sake: assembly, diversity
 * enforcement and contracts all come from the shipped modules.
 */

import {
  buildCorpus,
  buildUsers,
  simulateForYou,
  CATEGORIES,
  type SimUser,
} from "./feedSimulation";
import {
  resolveContentLanguages,
  languageRelevance,
  type ResolvedLanguages,
} from "@/lib/languageRelevance";
import { balanceByLanguage, derivePrimaryLanguage } from "@/lib/languageBalance";
import type { SurfaceVideo } from "../../supabase/functions/_shared/surfaces/types.ts";

const MARKETS: Array<{ country: string; device: string }> = [
  { country: "BD", device: "bn" },
  { country: "IN", device: "hi" },
  { country: "PK", device: "ur" },
  { country: "ID", device: "id" },
  { country: "MY", device: "ms" },
  { country: "TR", device: "tr" },
  { country: "SA", device: "ar" },
  { country: "AE", device: "ar" },
  { country: "US", device: "en" },
  { country: "GB", device: "en" },
];

export interface RecSimUser extends SimUser {
  country: string;
  deviceLanguage: string;
  explicitLanguages: string[] | null;
  behavior: Record<string, number>;
  interests: string[];
  /** video_ids already watched — repeat exposure should stay low. */
  watched: Set<string>;
  /** channel_ids the user thumbed down — must not be re-served. */
  disliked: Set<string>;
  /** 0..1 appetite for content outside known interests. */
  exploration: number;
  resolved: ResolvedLanguages;
}

export function buildRecUsers(n = 1000): RecSimUser[] {
  return buildUsers(n).map((u, i) => {
    const market = MARKETS[i % MARKETS.length];
    // Every 5th user has explicit preferences; every 7th demonstrates
    // cross-language behaviour; the rest run on region + device only.
    const explicit =
      i % 5 === 0
        ? Array.from(new Set([market.device, i % 10 === 0 ? "en" : "ar"]))
        : null;
    const behavior: Record<string, number> = {};
    if (i % 7 === 0) behavior[["ar", "en", "ur", "id"][i % 4]] = 5 + (i % 10);

    const interests = [
      CATEGORIES[i % CATEGORIES.length],
      CATEGORIES[(i * 3 + 1) % CATEGORIES.length],
      CATEGORIES[(i * 7 + 2) % CATEGORIES.length],
    ];

    return {
      ...u,
      country: market.country,
      deviceLanguage: market.device,
      explicitLanguages: explicit,
      behavior,
      interests: Array.from(new Set(interests)),
      watched: new Set<string>(),
      disliked: new Set<string>([`ch${(i * 11) % 60}`]),
      exploration: ((i % 10) + 1) / 12,
      resolved: resolveContentLanguages({
        country: market.country,
        deviceLanguage: market.device,
        explicit,
        behavior,
      }),
    };
  });
}

function personalize(user: RecSimUser, items: SurfaceVideo[]): SurfaceVideo[] {
  const kept = items.filter((v) => !user.disliked.has(v.channel_id));
  const scored = kept.map((v, i) => {
    const interest = user.interests.includes(v.category ?? "") ? 1 : 0.55 + user.exploration * 0.3;
    const seen = user.watched.has(v.video_id) ? 0.15 : 1;
    return {
      v,
      i,
      score: interest * seen * languageRelevance(
        { language: v.content_language, languageConfidence: 0.9 },
        user.resolved,
      ),
    };
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  const ranked = scored.map((s) => s.v);
  const primary = derivePrimaryLanguage(user.resolved.languages);
  return balanceByLanguage(ranked, (v) => v.content_language ?? null, primary, 24);
}

/**
 * Language-aware retrieval, mirroring production: the retriever narrows to the
 * languages the user can actually follow, and falls back to the full corpus
 * when that supply is too thin to fill a page (never a hard block).
 */
const MIN_POOL = 400;
function retrievalPool(user: RecSimUser, corpus: SurfaceVideo[]): SurfaceVideo[] {
  const eligible = corpus.filter(
    (v) =>
      languageRelevance({ language: v.content_language, languageConfidence: 0.9 }, user.resolved) >
      0.25,
  );
  return eligible.length >= MIN_POOL ? eligible : corpus;
}

/** One recommendation page for a user, honouring session rotation. */
export function recommendFor(
  user: RecSimUser,
  corpus: SurfaceVideo[],
  session = user.sessionId,
): SurfaceVideo[] {
  const pool = retrievalPool(user, corpus);
  const base = simulateForYou({ ...user, sessionId: session }, pool).items;
  return personalize(user, base);
}

export interface RecReport {
  users: number;
  meanItems: number;
  minItems: number;
  duplicatesWithinFeed: number;
  identicalFeedPairs: number;
  meanPairwiseJaccard: number;
  maxPairwiseJaccard: number;
  uniqueContentRate: number;
  maxCreatorShare: number;
  maxCategoryShare: number;
  languageMismatchRate: number;
  dislikedChannelExposures: number;
  repeatExposureRate: number;
  meanExplorationRate: number;
  personalizationLift: number;
  catalogCoverage: number;
}

const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

export function runRecommendationSimulation(
  users: RecSimUser[],
  corpus: SurfaceVideo[],
  topK = 20,
): RecReport {
  const feeds = users.map((u) => recommendFor(u, corpus));
  const sets = feeds.map((f) => new Set(f.slice(0, topK).map((v) => v.video_id)));

  let duplicatesWithinFeed = 0;
  let maxCreatorShare = 0;
  let maxCategoryShare = 0;
  let mismatched = 0;
  let total = 0;
  let dislikedExposures = 0;
  let repeats = 0;
  let exploration = 0;
  const seenGlobally = new Set<string>();

  feeds.forEach((feed, idx) => {
    const user = users[idx];
    const head = feed.slice(0, topK);
    const ids = new Set(head.map((v) => v.video_id));
    if (ids.size !== head.length) duplicatesWithinFeed++;

    const byChannel = new Map<string, number>();
    const byCategory = new Map<string, number>();
    let offInterest = 0;
    for (const v of head) {
      total++;
      seenGlobally.add(v.video_id);
      byChannel.set(v.channel_id, (byChannel.get(v.channel_id) ?? 0) + 1);
      const cat = v.category ?? "unknown";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
      if (user.disliked.has(v.channel_id)) dislikedExposures++;
      if (user.watched.has(v.video_id)) repeats++;
      if (!user.interests.includes(cat)) offInterest++;
      const rel = languageRelevance(
        { language: v.content_language, languageConfidence: 0.9 },
        user.resolved,
      );
      if (rel <= 0.25) mismatched++;
    }
    exploration += offInterest / Math.max(1, head.length);
    maxCreatorShare = Math.max(
      maxCreatorShare,
      Math.max(...byChannel.values()) / Math.max(1, head.length),
    );
    maxCategoryShare = Math.max(
      maxCategoryShare,
      Math.max(...byCategory.values()) / Math.max(1, head.length),
    );
  });

  // Pairwise similarity on a deterministic sample (full 1000x1000 is 500k pairs).
  let pairs = 0;
  let sumJ = 0;
  let maxJ = 0;
  let identical = 0;
  const stride = Math.max(1, Math.floor(sets.length / 120));
  for (let i = 0; i < sets.length; i += stride) {
    for (let j = i + 1; j < sets.length; j += stride) {
      const v = jaccard(sets[i], sets[j]);
      sumJ += v;
      pairs++;
      if (v > maxJ) maxJ = v;
      if (v === 1) identical++;
    }
  }

  // Popularity baseline: the same top-K for everyone, ranked by view_count.
  const baseline = [...corpus]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, topK);
  const baselineRelevance =
    users.reduce((acc, u) => {
      const rel =
        baseline.reduce(
          (s, v) =>
            s +
            languageRelevance(
              { language: v.content_language, languageConfidence: 0.9 },
              u.resolved,
            ) *
              (u.interests.includes(v.category ?? "") ? 1 : 0.55),
          0,
        ) / baseline.length;
      return acc + rel;
    }, 0) / users.length;
  const personalizedRelevance =
    feeds.reduce((acc, feed, idx) => {
      const u = users[idx];
      const head = feed.slice(0, topK);
      const rel =
        head.reduce(
          (s, v) =>
            s +
            languageRelevance(
              { language: v.content_language, languageConfidence: 0.9 },
              u.resolved,
            ) *
              (u.interests.includes(v.category ?? "") ? 1 : 0.55),
          0,
        ) / Math.max(1, head.length);
      return acc + rel;
    }, 0) / feeds.length;

  const lengths = feeds.map((f) => Math.min(f.length, topK));
  return {
    users: users.length,
    meanItems: lengths.reduce((a, b) => a + b, 0) / lengths.length,
    minItems: Math.min(...lengths),
    duplicatesWithinFeed,
    identicalFeedPairs: identical,
    meanPairwiseJaccard: sumJ / Math.max(1, pairs),
    maxPairwiseJaccard: maxJ,
    uniqueContentRate: seenGlobally.size / Math.max(1, total),
    maxCreatorShare,
    maxCategoryShare,
    languageMismatchRate: mismatched / Math.max(1, total),
    dislikedChannelExposures: dislikedExposures,
    repeatExposureRate: repeats / Math.max(1, total),
    meanExplorationRate: exploration / feeds.length,
    personalizationLift: personalizedRelevance / Math.max(0.0001, baselineRelevance),
    catalogCoverage: seenGlobally.size / corpus.length,
  };
}

export interface HeavyUserReport {
  sessions: number;
  distinctFeeds: number;
  meanNovelty: number;
  minNovelty: number;
  repeatExposureRate: number;
  catalogCoverage: number;
}

/** One high-frequency user opening the app N times, learning as they go. */
export function simulateHeavyUser(
  user: RecSimUser,
  corpus: SurfaceVideo[],
  sessions = 100,
  topK = 20,
): HeavyUserReport {
  const signatures = new Set<string>();
  const seen = new Set<string>();
  const novelties: number[] = [];
  let repeats = 0;
  let total = 0;

  for (let s = 0; s < sessions; s++) {
    const feed = recommendFor(user, corpus, `${user.sessionId}-s${s}`).slice(0, topK);
    signatures.add(feed.map((v) => v.video_id).join(","));
    let fresh = 0;
    for (const v of feed) {
      total++;
      if (seen.has(v.video_id)) repeats++;
      else fresh++;
      seen.add(v.video_id);
    }
    novelties.push(fresh / Math.max(1, feed.length));
    // The user watches roughly the first third of what they were shown.
    feed.slice(0, Math.ceil(feed.length / 3)).forEach((v) => user.watched.add(v.video_id));
  }

  return {
    sessions,
    distinctFeeds: signatures.size,
    meanNovelty: novelties.reduce((a, b) => a + b, 0) / novelties.length,
    minNovelty: Math.min(...novelties),
    repeatExposureRate: repeats / Math.max(1, total),
    catalogCoverage: seen.size / corpus.length,
  };
}

export { buildCorpus };
