/**
 * Public entrypoint of the moderation module.
 * Edge functions import from here — nothing deeper.
 *
 * Adding a new stage:
 *   1. Create a file under `stages/`
 *   2. Export a factory returning a `Stage`
 *   3. Include it in `defaultPipeline()` (or a custom pipeline)
 *
 * Adding a new AI provider:
 *   1. Create a file under `providers/`
 *   2. Register it in `providers/index.ts`
 *   3. Set `preferred_ai_provider` in the moderation_thresholds row
 */
export * from "./types.ts";
export { runPipeline, decideState } from "./engine.ts";
export { loadThresholds, THRESHOLD_DEFAULTS } from "./thresholds.ts";
export { persistDecision } from "./persistence.ts";

import type { Stage } from "./types.ts";
import { ruleStage } from "./stages/ruleStage.ts";
import { reputationStage } from "./stages/reputationStage.ts";
import { metadataStage } from "./stages/metadataStage.ts";
import { aiStage } from "./stages/aiStage.ts";

/**
 * The default production pipeline order.
 * Order matters: cheap deterministic checks first, expensive AI last so it
 * only runs on content that survives rule + reputation gating.
 */
export function defaultPipeline(supabaseUrl: string, serviceKey: string): Stage[] {
  return [
    ruleStage(supabaseUrl, serviceKey),
    reputationStage(supabaseUrl, serviceKey),
    metadataStage(),
    aiStage(),
  ];
}
