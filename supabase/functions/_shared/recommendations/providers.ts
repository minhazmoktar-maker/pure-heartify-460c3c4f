/**
 * Provider registry. Add new strategies (embeddings, ML re-rankers,
 * bandits) here and select via REC_PROVIDER env.
 *
 * Planned future providers (see docs/RECOMMENDATIONS.md):
 *   - EmbeddingsRecommendationProvider  (pgvector + google/gemini-embedding-001)
 *   - MlReRanker                        (learned weights on top of hybrid-rules)
 *   - ContextualBandit                  (Thompson sampling over reason weights)
 */
import type { RecommendationProvider } from "./types.ts";
import { HybridRulesRecommendationProvider } from "./hybridRules.ts";

export function getRecommendationProvider(): RecommendationProvider {
  const name = (Deno.env.get("REC_PROVIDER") ?? "hybrid-rules").toLowerCase();
  switch (name) {
    // case "embeddings": return new EmbeddingsRecommendationProvider();
    // case "ml":         return new MlReRanker();
    case "hybrid-rules":
    default:
      return new HybridRulesRecommendationProvider();
  }
}
