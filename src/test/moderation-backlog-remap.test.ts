import { describe, it, expect } from "vitest";
import {
  remapBacklogOutcome,
  TRUSTED_AUTO_APPROVE_MAX_RISK,
} from "../../supabase/functions/_shared/moderation/backlogPolicy";
import type { PipelineOutcome } from "../../supabase/functions/_shared/moderation/types";

function outcome(over: Partial<PipelineOutcome> = {}): PipelineOutcome {
  return {
    video_id: "v1",
    final_state: "rejected",
    final_stage: "ai_reasoning",
    confidence: 40,
    risk: 25,
    reasoning: "No rule violations detected",
    signals: {},
    rule_hits: [],
    stage_results: [],
    ...over,
  };
}

const trusted = { channel_reputation: { reputation: "approved", risk_level: "low", trust_score: 88 } };

describe("moderate-backlog outcome remap", () => {
  it("blocks hard rule hits", () => {
    const r = remapBacklogOutcome(
      outcome({
        final_state: "human_review_required",
        rule_hits: [{ name: "music", kind: "keyword", severity: "hard", matched: "song" }],
      }),
    );
    expect(r.final_state).toBe("blocked");
  });

  it("keeps terminal blocked verdicts blocked", () => {
    expect(remapBacklogOutcome(outcome({ final_state: "blocked" })).final_state).toBe("blocked");
  });

  it("auto-approves trusted channels at or below the risk ceiling", () => {
    for (const risk of [0, 15, TRUSTED_AUTO_APPROVE_MAX_RISK]) {
      const r = remapBacklogOutcome(outcome({ risk, signals: { ...trusted } }));
      expect(r.final_state).toBe("auto_approved");
    }
  });

  it("escalates trusted channels above the risk ceiling", () => {
    const r = remapBacklogOutcome(outcome({ risk: 41, signals: { ...trusted } }));
    expect(r.final_state).toBe("human_review_required");
  });

  it("never trusts whitelisted channels flagged high or critical risk", () => {
    for (const risk_level of ["high", "critical"]) {
      const r = remapBacklogOutcome(
        outcome({ risk: 10, signals: { channel_reputation: { reputation: "approved", risk_level } } }),
      );
      expect(r.final_state).toBe("human_review_required");
    }
  });

  it("never rejects silently — untrusted channels escalate", () => {
    for (const state of ["rejected", "ai_review_required", "pending_review"] as const) {
      const r = remapBacklogOutcome(outcome({ final_state: state, risk: 70 }));
      expect(r.final_state).toBe("human_review_required");
    }
  });

  it("records an audit trail of the remap", () => {
    const r = remapBacklogOutcome(outcome());
    const remap = r.signals.backlog_remap as Record<string, unknown>;
    expect(remap.applied).toBe(true);
    expect(remap.pipeline_state).toBe("rejected");
    expect(remap.remapped_state).toBe("human_review_required");
    expect(r.reasoning).toContain("backlog policy");
  });
});
