import { describe, it, expect } from "vitest";
import { decideState } from "../../supabase/functions/_shared/moderation/engine";

const thresholds = {
  reject_below_confidence: 0.5,
  block_above_risk: 90,
  human_review_above_risk: 60,
  auto_approve_above_confidence: 0.9,
} as never;

/**
 * Regression guard for the corpus-trust bug: an AI provider outage produced
 * confidence 0 / risk 80 with no rule hits, and the engine turned that into a
 * hard rejection — 146k clean videos were lost that way.
 */
describe("moderation decideState — provider outage", () => {
  it("escalates instead of rejecting when the AI provider was unavailable", () => {
    const state = decideState(0, 80, thresholds, [], ["ai_unavailable"]);
    expect(state).toBe("human_review_required");
  });

  it("still escalates other stage failures", () => {
    for (const flag of ["parse_failed", "stage_error", "low_quality_reasoning"]) {
      expect(decideState(0, 80, thresholds, [], [flag])).toBe("human_review_required");
    }
  });

  it("still blocks hard rule hits", () => {
    const state = decideState(
      0.99,
      10,
      thresholds,
      [{ rule: "music", severity: "hard" } as never],
      [],
    );
    expect(state).toBe("blocked");
  });
});
