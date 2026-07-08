import type { Stage, StageResult, Thresholds, VideoContext } from "../types.ts";
import { withProviderFallback } from "../providers/index.ts";

/**
 * AI reasoning stage. Delegates to a pluggable AI provider chosen by
 * the current thresholds (preferred + fallback). Never hard-codes a model.
 */
export function aiStage(): Stage {
  return {
    name: "ai_reasoning",
    async run(ctx: VideoContext, t: Thresholds): Promise<StageResult> {
      const outcome = await withProviderFallback(
        t.preferred_ai_provider,
        t.fallback_ai_provider,
        (p) => p.analyze(ctx),
      );

      if ("error" in outcome) {
        return {
          stage: "ai_reasoning",
          state: "human_review_required",
          confidence: 0,
          risk: 80,
          reasoning: "AI providers unavailable — escalating for human review",
          signals: { error: outcome.error },
        };
      }

      const v = outcome.result;
      return {
        stage: "ai_reasoning",
        state: "pending_review",
        confidence: v.confidence,
        risk: v.risk,
        provider: outcome.provider,
        reasoning: v.reasoning,
        signals: { flags: v.flags, category: v.category },
      };
    },
  };
}
