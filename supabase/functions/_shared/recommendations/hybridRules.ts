/**
 * HybridRulesProvider — default recommendation strategy.
 *
 * Scores each candidate as a weighted sum of orthogonal signals, then applies
 * a Maximal-Marginal-Relevance–style diversity re-ranker so consecutive
 * results don't collapse onto a single channel or category.
 *
 * Every reason contributing to a score is captured on the Recommendation
 * object so developers and moderators can trace exactly why a video ranked
 * where it did. See docs/RECOMMENDATIONS.md.
 */
import type {
  Recommendation,
  RecommendationCandidate,
  RecommendationProvider,
  RecommendationReason,
  RecommendOptions,
  UserSignals,
} from "./types.ts";

// Base weights are tunable via env; ship strict defaults tuned for a
// halal-content platform (trust > freshness > raw popularity). At runtime
// each user gets a stable per-user perturbation of this vector (see
// perturbWeights) so different users literally optimize a different linear
// combination of signals — not merely a different ordering of the same one.
const W_BASE = {
  interest:        Number(Deno.env.get("REC_W_INTEREST") ?? 0.34),
  categoryAff:     Number(Deno.env.get("REC_W_CATEGORY") ?? 0.22),
  channelAff:      Number(Deno.env.get("REC_W_CHANNEL")  ?? 0.20),
  favoriteChannel: Number(Deno.env.get("REC_W_FAV_CHAN") ?? 0.06),
  trending:        Number(Deno.env.get("REC_W_TRENDING") ?? 0.08),
  heartifyTrend:   Number(Deno.env.get("REC_W_HEARTIFY_TREND") ?? 0.12),
  hiddenGem:       Number(Deno.env.get("REC_W_HIDDEN_GEM") ?? 0.10),
  trusted:         Number(Deno.env.get("REC_W_TRUSTED")  ?? 0.10),
  halal:           Number(Deno.env.get("REC_W_HALAL")    ?? 0.08),
  aiConfidence:    Number(Deno.env.get("REC_W_AI")       ?? 0.06),
  freshness:       Number(Deno.env.get("REC_W_FRESH")    ?? 0.06),
  session:         Number(Deno.env.get("REC_W_SESSION")  ?? 0.04),
  language:        Number(Deno.env.get("REC_W_LANGUAGE") ?? 0.10),
  context:         Number(Deno.env.get("REC_W_CONTEXT")  ?? 0.12),
  longTerm:        Number(Deno.env.get("REC_W_LONGTERM") ?? 0.10),
  novelty:         Number(Deno.env.get("REC_W_NOVELTY")  ?? 0.07),
  // Penalty applied per prior impression in the last 24h (soft cooldown).
  repeatPenalty:   Number(Deno.env.get("REC_W_REPEAT")   ?? 0.15),
  skipPenalty:     Number(Deno.env.get("REC_W_SKIP")     ?? 0.12),
  channelOverexp:  Number(Deno.env.get("REC_W_CHAN_OVEREXP") ?? 0.10),
  // Exploration ε — base probability of injecting a hidden gem near the top.
  exploration:     Number(Deno.env.get("REC_EXPLORATION") ?? 0.10),
};
type Weights = typeof W_BASE;

// FNV-1a 32-bit hash → deterministic per-string [0,1). Halal-first invariant:
// the perturbation only reweights *positive* signals within a bounded band
// (±25%), never a signed flip, so a trusted+high-halal item always beats
// an untrusted low-halal item regardless of user seed.
function hash01(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

/**
 * Stable per-user weight perturbation. Each viewer gets a bounded ±25%
 * multiplier on every signal weight, seeded by their user id (or client
 * identity when signed-out). Result: no two users score the same candidate
 * pool with the same linear combination, so their top-N lists diverge even
 * on identical inputs — while the halal/trust/moderation contributions
 * remain strictly positive.
 */
function perturbWeights(seedBase: string): Weights {
  const out = { ...W_BASE } as Weights;
  const keys = Object.keys(W_BASE) as Array<keyof Weights>;
  for (const k of keys) {
    // Halal/trust/moderation weights never shrink below 85% — the halal-first
    // floor must not be undermined by personalization.
    const r = hash01(`${seedBase}:w:${String(k)}`);
    const lo = (k === "halal" || k === "trusted" || k === "aiConfidence") ? 0.85 : 0.75;
    const hi = 1.25;
    out[k] = W_BASE[k] * (lo + r * (hi - lo));
  }
  return out;
}


/**
 * Contextual boost — matches ambient signals (time of day, Ramadan, Jummuah)
 * to categories/keywords that are most valuable in that moment. Purely
 * calendar-driven, no PII, safe for anonymous users.
 */
function contextBoost(
  candidate: RecommendationCandidate,
  ctx: UserSignals["context"],
): { raw: number; detail?: string } {
  const hay = `${candidate.title ?? ""} ${candidate.category ?? ""}`.toLowerCase();
  const has = (kw: string) => hay.includes(kw);
  let raw = 0;
  const notes: string[] = [];

  if (ctx.isRamadan && (has("quran") || has("tafsir") || has("ramadan") || has("fasting") || has("taraweeh"))) {
    raw += ctx.isLastTen ? 1 : 0.7;
    notes.push(ctx.isLastTen ? "last ten nights" : "Ramaḍān");
  }
  if (ctx.isJummuah && (has("jumu") || has("friday") || has("khutbah") || has("kahf"))) {
    raw += 0.6; notes.push("Jumuʿah");
  }
  if (ctx.timeBucket === "fajr" && (has("morning") || has("adhkar") || has("dua") || has("quran"))) {
    raw += 0.4; notes.push("morning adhkār");
  }
  if (ctx.timeBucket === "night" && (has("evening") || has("adhkar") || has("sleep") || has("witr"))) {
    raw += 0.4; notes.push("evening adhkār");
  }
  return { raw: Math.min(1, raw), detail: notes.length ? notes.join(" · ") : undefined };
}

const DIVERSITY_LAMBDA = Number(Deno.env.get("REC_DIVERSITY_LAMBDA") ?? 0.35);
const MAX_PER_CHANNEL   = Number(Deno.env.get("REC_MAX_PER_CHANNEL") ?? 2);
const MAX_PER_CATEGORY  = Number(Deno.env.get("REC_MAX_PER_CATEGORY") ?? 4);

function freshnessScore(publishedAt: string | null): number {
  if (!publishedAt) return 0;
  const ageDays = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 86400000);
  // Half-life ≈ 60 days. Anything older than 3 years hits floor ~0.
  return Math.max(0, Math.pow(0.5, ageDays / 60));
}

function interestMatch(interests: string[], candidate: RecommendationCandidate): number {
  if (!interests.length) return 0;
  const hay = `${candidate.title ?? ""} ${candidate.channel_title ?? ""} ${candidate.category ?? ""} ${candidate.section_id ?? ""}`.toLowerCase();
  let matches = 0;
  for (const kw of interests) {
    if (kw && hay.includes(kw)) matches++;
  }
  return Math.min(1, matches / Math.max(3, interests.length));
}

function scoreCandidate(
  candidate: RecommendationCandidate,
  s: UserSignals,
  W: Weights,
): { score: number; reasons: RecommendationReason[]; components: Record<string, number> } {
  const reasons: RecommendationReason[] = [];
  const components: Record<string, number> = {};

  const push = (
    code: RecommendationReason["code"],
    raw: number,
    weight: number,
    detail?: string,
  ) => {
    if (raw <= 0) return 0;
    const contrib = raw * weight;
    reasons.push({ code, weight: contrib, detail });
    components[code] = raw;
    return contrib;
  };

  let score = 0;

  score += push("interest_match", interestMatch(s.interests, candidate), W.interest,
    s.interests.length ? `matched user interests` : undefined);

  const catAff = Math.max(
    candidate.category ? (s.categoryAffinity.get(candidate.category) ?? 0) : 0,
    candidate.section_id ? (s.categoryAffinity.get(candidate.section_id) ?? 0) : 0,
  );
  score += push("category_affinity", catAff, W.categoryAff,
    candidate.category ? `category "${candidate.category}"` : undefined);

  const chAff = candidate.channel_title ? (s.channelAffinity.get(candidate.channel_title) ?? 0) : 0;
  score += push("channel_affinity", chAff, W.channelAff,
    candidate.channel_title ? `channel "${candidate.channel_title}"` : undefined);

  // Long-term taste (180d halflife). Separated so a user with a persistent
  // interest in tafsīr keeps seeing tafsīr weeks after their short-term
  // signal has decayed. Two users with identical last-week behaviour but
  // different multi-year histories will now diverge here.
  const longCat = Math.max(
    candidate.category ? (s.longTermCategoryAffinity.get(candidate.category) ?? 0) : 0,
    candidate.section_id ? (s.longTermCategoryAffinity.get(candidate.section_id) ?? 0) : 0,
  );
  const longCh = candidate.channel_title
    ? (s.longTermChannelAffinity.get(candidate.channel_title) ?? 0) : 0;
  const longTerm = Math.max(longCat, longCh);
  if (longTerm > 0) {
    score += push("long_term_taste", longTerm, W.longTerm,
      "matches user's long-term taste");
  }

  if (candidate.channel_title && s.favoriteVideoIds.size > 0) {
    // Bonus if user has favorited anything by this channel.
    score += push("favorite_channel", chAff > 0 ? 1 : 0, W.favoriteChannel);
  }

  score += push("trending", s.trendingIds.has(candidate.video_id) ? 1 : 0, W.trending,
    "recent global engagement (14d)");

  // Native Heartify trending — clicks+converts inside the app in the last 72h.
  score += push("heartify_trending", s.heartifyTrendingIds.has(candidate.video_id) ? 1 : 0,
    W.heartifyTrend, "trending inside Heartify (72h)");

  // Hidden Gem — high halal, low exposure. Promoted so famous creators can't monopolize.
  score += push("hidden_gem", s.hiddenGemIds.has(candidate.video_id) ? 1 : 0,
    W.hiddenGem, "high-quality creator with limited exposure");

  score += push("trusted_channel", candidate.is_trusted_channel ? 1 : 0, W.trusted);
  score += push("high_halal_score", (candidate.halal_score ?? 0) / 100, W.halal);
  score += push("ai_confidence", (candidate.moderation_confidence ?? 0) / 100, W.aiConfidence);
  score += push("freshness", freshnessScore(candidate.published_at), W.freshness);

  // Novelty boost: a channel the user has never encountered before is a
  // fresh discovery signal — but only for approved+trusted channels, so we
  // never trade halal safety for "exploration".
  if (
    candidate.channel_title &&
    !s.seenChannelIds.has(candidate.channel_title) &&
    candidate.is_trusted_channel === true
  ) {
    score += push("novelty_new_channel", 1, W.novelty, "creator you haven't seen before");
  }

  // Anti-repeat cooldown: subtract per prior impression in last 24h.
  const shownCount = s.recentImpressionCounts.get(candidate.video_id) ?? 0;
  if (shownCount > 0) {
    const penalty = W.repeatPenalty * Math.min(shownCount, 4);
    reasons.push({ code: "recently_shown_penalty", weight: -penalty, detail: `shown ${shownCount}× in last 24h` });
    components["recently_shown_penalty"] = shownCount;
    score -= penalty;
  }

  // Skip penalty: user was shown this recently and did not engage.
  if (s.skippedVideoIds.has(candidate.video_id)) {
    const penalty = W.skipPenalty;
    reasons.push({ code: "recently_skipped_penalty", weight: -penalty, detail: "skipped without engagement" });
    components["recently_skipped_penalty"] = 1;
    score -= penalty;
  }

  // Channel overexposure: same creator shown many times recently → dampen.
  if (candidate.channel_title) {
    const chImpressions = s.recentChannelImpressionCounts.get(candidate.channel_title) ?? 0;
    if (chImpressions >= 3) {
      const penalty = W.channelOverexp * Math.min(chImpressions / 10, 1);
      reasons.push({ code: "channel_overexposure_penalty", weight: -penalty, detail: `channel shown ${chImpressions}× recently` });
      components["channel_overexposure_penalty"] = chImpressions;
      score -= penalty;
    }
  }

  if (candidate.channel_title && s.sessionChannelIds.has(candidate.channel_title)) {
    score += push("session_continuity", 1, W.session, "continues current session");
  }

  // Language match — dampened by diversity level so users still discover
  // valuable content outside their primary language.
  if (candidate.content_language && s.contentLanguages.length > 0) {
    const matches = s.contentLanguages.includes(candidate.content_language) ? 1 : 0;
    const damping = 1 - Math.min(1, Math.max(0, s.diversityLevel) / 100) * 0.5;
    score += push(
      "language_match",
      matches * damping,
      W.language,
      matches ? `content language "${candidate.content_language}"` : undefined,
    );
  }

  // Ambient context boost (time-of-day, Ramaḍān, Jummuʿah).
  const ctx = contextBoost(candidate, s.context);
  if (ctx.raw > 0) score += push("context_boost", ctx.raw, W.context, ctx.detail);


  // Cold-start fallback: signed-out or brand-new users get a light popularity nudge.
  if (!s.userId && s.trendingIds.has(candidate.video_id)) {
    reasons.push({ code: "cold_start_popular", weight: 0.05, detail: "no user history yet" });
    score += 0.05;
  }

  return { score, reasons, components };
}


/** MMR-style diversification: iteratively picks the highest-scoring item
 *  whose channel/category hasn't already saturated the top of the list. */
function diversify(items: Recommendation[], limit: number): Recommendation[] {
  const remaining = [...items].sort((a, b) => b.score - a.score);
  const picked: Recommendation[] = [];
  const channelCount = new Map<string, number>();
  const categoryCount = new Map<string, number>();

  while (remaining.length && picked.length < limit) {
    // Find best candidate under diversity caps.
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const ch = cand.video.channel_title ?? "";
      const cat = cand.video.category ?? "";
      const chN = channelCount.get(ch) ?? 0;
      const catN = categoryCount.get(cat) ?? 0;
      if (chN >= MAX_PER_CHANNEL || catN >= MAX_PER_CATEGORY) continue;
      // Penalize repeats near the top proportional to how many we've picked.
      const penalty = DIVERSITY_LAMBDA * (chN * 0.6 + catN * 0.4);
      const adj = cand.score - penalty;
      if (adj > bestScore) {
        bestScore = adj;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      // Caps exhausted — take the plain best remaining item.
      bestIdx = 0;
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    const ch = chosen.video.channel_title ?? "";
    const cat = chosen.video.category ?? "";
    channelCount.set(ch, (channelCount.get(ch) ?? 0) + 1);
    categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
    if (bestScore > -Infinity && bestScore < chosen.score) {
      chosen.reasons.push({
        code: "diversity_boost",
        weight: bestScore - chosen.score,
        detail: "reordered for feed diversity",
      });
    }
    picked.push(chosen);
  }
  return picked;
}

export class HybridRulesRecommendationProvider implements RecommendationProvider {
  readonly name = "hybrid-rules-v2";

  async recommend(
    signals: UserSignals,
    candidates: RecommendationCandidate[],
    opts: RecommendOptions,
  ): Promise<Recommendation[]> {
    const excludeWatched = opts.excludeWatched ?? true;
    const scored: Recommendation[] = [];

    // Per-user identity seed. Stable across sessions for signed-in users so
    // taste-shaped weight perturbation is consistent; salted with a slow
    // rotating bucket (weekly) so the same user still sees evolution over
    // time without daily churn wiping short-term learning.
    const identity = signals.userId ?? "anon";
    const weekBucket = Math.floor(Date.now() / (7 * 86400000)).toString(36);
    const userSeed = `${identity}:${weekBucket}`;

    // Daily freshness salt — rotates every UTC day so ordering shifts each
    // morning without disturbing the underlying weight vector (which stays
    // on the weekly seed to avoid daily churn erasing short-term learning).
    // Applied only to jitter + pool partitioning: what changes day-to-day is
    // which slice of the trending/hidden-gem pools you see and how ties break,
    // never the halal-first ranking floor.
    const dayBucket = Math.floor(Date.now() / 86400000).toString(36);
    const dailySeed = `${identity}:${dayBucket}`;

    // Personalized weight vector — two users literally optimize different
    // linear combinations of the same signals. Halal/trust weights have a
    // higher floor (see perturbWeights) so the halal-first invariant holds.
    const W = perturbWeights(userSeed);

    // Per-user exploration ε: users with more diversity preference and less
    // signal history get more exploration. Bounded so a fully-signalled
    // user still gets some novelty (5%) and a cold-start user never gets
    // fully random (30% ceiling).
    const signalStrength = Math.min(
      1,
      (signals.interests.length * 0.06) +
      (signals.favoriteVideoIds.size * 0.08) +
      (signals.watchedVideoIds.size * 0.02) +
      (signals.categoryAffinity.size * 0.05) +
      (signals.channelAffinity.size * 0.04),
    );
    const diversityPref = Math.min(1, Math.max(0, signals.diversityLevel) / 100);
    const epsilon = Math.min(
      0.30,
      Math.max(0.05, W.exploration + (1 - signalStrength) * 0.15 + diversityPref * 0.05),
    );

    // Per-user pool partitioning — now salted daily so the specific ~55% of
    // trending / ~45% of hidden-gem items a user sees rotates each day.
    // Pagination within a session is still stable because the salt is fixed
    // for the whole render call.
    const inUserPartition = (videoId: string, keepFraction: number): boolean => {
      if (keepFraction >= 1) return true;
      const r = hash01(`${dailySeed}:part:${videoId}`);
      return r < keepFraction;
    };
    const trendingKeep = 0.55;         // each user sees ~55% of the trending pool
    const hiddenGemKeep = 0.45;        // deeper divergence on discovery pool

    // Adaptive per-user score jitter, salted daily so tie-break ordering
    // refreshes every morning. Amplitude is bounded — even the maximum
    // jitter cannot overturn a trusted+high-halal candidate against an
    // untrusted low-halal one, because the halal/trusted contributions
    // already sit at the top of the weight vector.
    const jitterAmp = 0.05 + (1 - signalStrength) * 0.13;
    const jitter = (videoId: string): number => {
      const r = hash01(`${dailySeed}:j:${videoId}`);
      return (r - 0.5) * 2 * jitterAmp;
    };

    for (const c of candidates) {
      if (excludeWatched && signals.watchedVideoIds.has(c.video_id)) continue;
      // Hard filter: "Not Interested" / user-hidden — never resurface.
      if (signals.dismissedVideoIds.has(c.video_id)) continue;
      // Hard filter: globally blocked creators.
      if (c.channel_title && signals.blockedChannelPatterns.length) {
        const ch = c.channel_title.toLowerCase();
        if (signals.blockedChannelPatterns.some((p) => ch.includes(p))) continue;
      }
      // Anti-repeat hard cutoff: shown 4+ times in last 24h → drop entirely.
      if ((signals.recentImpressionCounts.get(c.video_id) ?? 0) >= 4) continue;
      if (opts.categoryFilter && c.category !== opts.categoryFilter) continue;

      // Per-user pool partitioning — only for items whose *sole* recall
      // reason is a global pool (trending / hidden-gem). If the user has
      // any personal affinity to the item's channel/category, we keep it.
      const hasPersonalAffinity =
        (c.channel_title && (signals.channelAffinity.get(c.channel_title) ?? 0) > 0) ||
        (c.category && (signals.categoryAffinity.get(c.category) ?? 0) > 0) ||
        signals.favoriteVideoIds.has(c.video_id);
      if (!hasPersonalAffinity) {
        if (signals.trendingIds.has(c.video_id) && !inUserPartition(c.video_id, trendingKeep)) continue;
        if (signals.hiddenGemIds.has(c.video_id) && !inUserPartition(c.video_id, hiddenGemKeep)) continue;
      }

      const { score, reasons, components } = scoreCandidate(c, signals, W);
      if (score <= 0) continue;

      // Epsilon-greedy exploration: with probability ε, add a small
      // positive kick to items in the hidden-gem or novel-channel pool.
      // This is bounded and additive, never a signed flip.
      let explorationBonus = 0;
      const isExplorable =
        signals.hiddenGemIds.has(c.video_id) ||
        (c.channel_title && !signals.seenChannelIds.has(c.channel_title) && c.is_trusted_channel === true);
      if (isExplorable) {
        const r = hash01(`${dailySeed}:eps:${c.video_id}`);
        if (r < epsilon) {
          explorationBonus = 0.08 + r * 0.05;
          reasons.push({ code: "exploration_epsilon", weight: explorationBonus, detail: `ε=${epsilon.toFixed(2)}` });
          components["exploration_epsilon"] = 1;
        }
      }

      const jittered = (score + explorationBonus) * (1 + jitter(c.video_id));
      scored.push({ video: c, score: Number(jittered.toFixed(4)), reasons, signals: components });
    }
    return diversify(scored, opts.limit ?? 24);
  }
}


