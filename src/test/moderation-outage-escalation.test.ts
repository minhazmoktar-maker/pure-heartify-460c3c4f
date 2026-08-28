import { describe, it, expect } from "vitest";
import { decideState } from "../../supabase/functions/_shared/moderation/engine";

const thresholds = {
  reject_below_confidence: 60,
  block_above_risk: 90,
  human_review_min_confidence: 60,
  auto_approve_min_confidence: 98,
  auto_approve_max_risk: 5,
  ai_review_min_confidence: 90,
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

/**
 * Second false-positive class: the AI returned a *usable* verdict with low
 * confidence and low risk and no rule hits. That is "we don't know", not a
 * policy violation, and must never be a rejection.
 */
describe("moderation decideState — uncertainty is not evidence", () => {
  it("escalates low confidence with low risk and no rule hits", () => {
    expect(decideState(40, 25, thresholds, [], [])).toBe("human_review_required");
    expect(decideState(40, 30, thresholds, [], [])).toBe("human_review_required");
    expect(decideState(10, 49, thresholds, [], [])).toBe("human_review_required");
  });

  it("still rejects low confidence when risk is elevated", () => {
    expect(decideState(40, 50, thresholds, [], [])).toBe("rejected");
    expect(decideState(40, 80, thresholds, [], [])).toBe("rejected");
  });

  it("still rejects low confidence when a soft rule fired", () => {
    expect(
      decideState(40, 10, thresholds, [{ rule: "suspect_title", severity: "soft" } as never], []),
    ).toBe("rejected");
  });
});
