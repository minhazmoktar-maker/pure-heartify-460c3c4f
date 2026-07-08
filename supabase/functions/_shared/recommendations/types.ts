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
  categoryAffinity: Map<string, number>;     // normalized 0..1
  channelAffinity: Map<string, number>;      // normalized 0..1
  sessionChannelIds: Set<string>;            // channels seen in last hour
  trendingIds: Set<string>;                  // globally trending, last 14d
  contentLanguages: string[];                // preferred content languages
  diversityLevel: number;                    // 0..100, higher = more out-of-language content
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
    | "trusted_channel"
    | "high_halal_score"
    | "ai_confidence"
    | "freshness"
    | "session_continuity"
    | "cold_start_popular"
    | "diversity_boost"
    | "language_match";
  weight: number;
  detail?: string;
}

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
