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

// Weights are tunable via env; ship strict defaults tuned for a
// halal-content platform (trust > freshness > raw popularity).
const W = {
  interest:        Number(Deno.env.get("REC_W_INTEREST") ?? 0.18),
  categoryAff:     Number(Deno.env.get("REC_W_CATEGORY") ?? 0.16),
  channelAff:      Number(Deno.env.get("REC_W_CHANNEL")  ?? 0.14),
  favoriteChannel: Number(Deno.env.get("REC_W_FAV_CHAN") ?? 0.06),
  trending:        Number(Deno.env.get("REC_W_TRENDING") ?? 0.10),
  trusted:         Number(Deno.env.get("REC_W_TRUSTED")  ?? 0.10),
  halal:           Number(Deno.env.get("REC_W_HALAL")    ?? 0.08),
  aiConfidence:    Number(Deno.env.get("REC_W_AI")       ?? 0.06),
  freshness:       Number(Deno.env.get("REC_W_FRESH")    ?? 0.08),
  session:         Number(Deno.env.get("REC_W_SESSION")  ?? 0.04),
  language:        Number(Deno.env.get("REC_W_LANGUAGE") ?? 0.10),
  context:         Number(Deno.env.get("REC_W_CONTEXT")  ?? 0.12),
};

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
  const hay = `${candidate.title ?? ""} ${candidate.channel_title ?? ""} ${candidate.category ?? ""}`.toLowerCase();
  let matches = 0;
  for (const kw of interests) {
    if (kw && hay.includes(kw)) matches++;
  }
  return Math.min(1, matches / Math.max(3, interests.length));
}

function scoreCandidate(
  candidate: RecommendationCandidate,
  s: UserSignals,
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

  const catAff = candidate.category ? (s.categoryAffinity.get(candidate.category) ?? 0) : 0;
  score += push("category_affinity", catAff, W.categoryAff,
    candidate.category ? `category "${candidate.category}"` : undefined);

  const chAff = candidate.channel_title ? (s.channelAffinity.get(candidate.channel_title) ?? 0) : 0;
  score += push("channel_affinity", chAff, W.channelAff,
    candidate.channel_title ? `channel "${candidate.channel_title}"` : undefined);

  if (candidate.channel_title && s.favoriteVideoIds.size > 0) {
    // Bonus if user has favorited anything by this channel.
    score += push("favorite_channel", chAff > 0 ? 1 : 0, W.favoriteChannel);
  }

  score += push("trending", s.trendingIds.has(candidate.video_id) ? 1 : 0, W.trending,
    "recent global engagement");

  score += push("trusted_channel", candidate.is_trusted_channel ? 1 : 0, W.trusted);
  score += push("high_halal_score", (candidate.halal_score ?? 0) / 100, W.halal);
  score += push("ai_confidence", (candidate.moderation_confidence ?? 0) / 100, W.aiConfidence);
  score += push("freshness", freshnessScore(candidate.published_at), W.freshness);

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
  readonly name = "hybrid-rules-v1";

  async recommend(
    signals: UserSignals,
    candidates: RecommendationCandidate[],
    opts: RecommendOptions,
  ): Promise<Recommendation[]> {
    const excludeWatched = opts.excludeWatched ?? true;
    const scored: Recommendation[] = [];
    for (const c of candidates) {
      if (excludeWatched && signals.watchedVideoIds.has(c.video_id)) continue;
      if (opts.categoryFilter && c.category !== opts.categoryFilter) continue;
      const { score, reasons, components } = scoreCandidate(c, signals);
      if (score <= 0) continue;
      scored.push({ video: c, score: Number(score.toFixed(4)), reasons, signals: components });
    }
    return diversify(scored, opts.limit ?? 24);
  }
}
