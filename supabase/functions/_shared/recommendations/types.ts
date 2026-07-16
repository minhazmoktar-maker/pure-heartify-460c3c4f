/**
 * Recommendation contracts.
 *
 * A RecommendationProvider produces a ranked list of candidates given a user
 * and a set of aggregated signals. Providers are swap-in / swap-out — today
 * we ship a hybrid rules provider, tomorrow we can add an embeddings/ANN
 * provider or an ML re-ranker on top without touching callers.
 */

export interface RecommendationCandidate {
  video_id: string;
  title: string;
  channel_title: string | null;
  category: string | null;
  thumbnail_url: string | null;
  halal_score: number | null;
  published_at: string | null;
  is_trusted_channel: boolean | null;
  view_count: number | null;
  moderation_confidence: number | null;
  moderation_state: string | null;
  content_language: string | null;
}

/** Aggregated per-user signals fed into every provider. */
export interface UserSignals {
  userId: string | null;
  interests: string[];                       // free-form topic strings
  favoriteCategories: string[];              // explicit category prefs
  watchedVideoIds: Set<string>;              // dedupe / recency
  recentVideoIds: string[];                  // last 20, order preserved
  favoriteVideoIds: Set<string>;             // liked/starred
  doseVideoIds: Set<string>;                 // Daily Dose completions
  categoryAffinity: Map<string, number>;     // normalized 0..1 (short-term, 14d halflife)
  channelAffinity: Map<string, number>;      // normalized 0..1 (short-term, 14d halflife)
  longTermCategoryAffinity: Map<string, number>; // normalized 0..1 (180d halflife, stable taste)
  longTermChannelAffinity: Map<string, number>;  // normalized 0..1 (180d halflife, stable taste)
  sessionChannelIds: Set<string>;            // channels seen in last hour
  sessionCategoryIds: Set<string>;           // categories seen in last hour
  seenChannelIds: Set<string>;               // every channel the user has ever watched (novelty base)
  trendingIds: Set<string>;                  // legacy trending pool (clicks+converts, 14d)
  heartifyTrendingIds: Set<string>;          // native Heartify trending (72h, weighted)
  hiddenGemIds: Set<string>;                 // high-halal, low-exposure promotion pool
  dismissedVideoIds: Set<string>;            // "Not Interested" / hidden by user
  skippedVideoIds: Set<string>;              // recently skipped (impression w/o click)
  blockedChannelPatterns: string[];          // lowercased substrings from blocked_creators
  recentImpressionCounts: Map<string, number>; // per-video impressions in last 24h
  recentChannelImpressionCounts: Map<string, number>; // per-channel impressions in last 24h
  contentLanguages: string[];                // preferred content languages
  diversityLevel: number;                    // 0..100, higher = more out-of-language content
  context: RecommendationContext;            // time-of-day / Ramadan / weekday
}

/** Ambient context — purely time/calendar-driven, no PII. */
export interface RecommendationContext {
  hour: number;               // 0..23, viewer-local best-effort (UTC fallback)
  dayOfWeek: number;          // 0=Sun..6=Sat
  isRamadan: boolean;
  isLastTen: boolean;         // last 10 nights of Ramadan
  isJummuah: boolean;         // Friday
  timeBucket: "fajr" | "morning" | "midday" | "afternoon" | "maghrib" | "night";
}

export interface Recommendation {
  video: RecommendationCandidate;
  score: number;
  reasons: RecommendationReason[];
  signals: Record<string, number>;
}

export interface RecommendationReason {
  code:
    | "interest_match"
    | "category_affinity"
    | "channel_affinity"
    | "favorite_channel"
    | "trending"
    | "heartify_trending"
    | "hidden_gem"
    | "trusted_channel"
    | "high_halal_score"
    | "ai_confidence"
    | "freshness"
    | "session_continuity"
    | "cold_start_popular"
    | "diversity_boost"
    | "recently_shown_penalty"
    | "recently_skipped_penalty"
    | "channel_overexposure_penalty"
    | "language_match"
    | "context_boost"
    | "novelty_new_channel"
    | "long_term_taste"
    | "exploration_epsilon";

export interface RecommendOptions {
  limit?: number;
  excludeWatched?: boolean;
  surface?: string;   // e.g. "home", "watch-next", "daily-dose"
  categoryFilter?: string | null;
}

export interface RecommendationProvider {
  readonly name: string;
  recommend(signals: UserSignals, candidates: RecommendationCandidate[], opts: RecommendOptions): Promise<Recommendation[]>;
}
