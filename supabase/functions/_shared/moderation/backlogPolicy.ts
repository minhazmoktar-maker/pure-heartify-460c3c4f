import type { PipelineOutcome } from "./types.ts";

/**
 * Backlog outcome remap.
 *
 * The bulk drainer (`moderate-backlog`) runs over videos that were ingested
 * long ago and never checked. For that population the generic threshold policy
 * is the wrong instrument: the AI stage frequently returns middling confidence
 * on sparse metadata, and turning that into `rejected` is exactly how ~150k
 * clean videos were lost once already.
 *
 * So the backlog uses a deliberately narrow, evidence-only policy:
 *
 *   1. Hard rule hit (or a terminal `blocked` verdict)  -> `blocked`
 *   2. Trusted channel AND aggregate risk <= maxRisk    -> `auto_approved`
 *   3. Everything else                                  -> `human_review_required`
 *
 * Nothing is ever silently rejected. The halal floor is unaffected: only
 * `auto_approved` rows are servable, and they still have to clear the visual
 * safety sweep (`visual_state = 'clean'`) afterwards.
 */
export const TRUSTED_AUTO_APPROVE_MAX_RISK = 40;

type ReputationSignals = {
  reputation?: string;
  trust_score?: number;
  risk_level?: string;
};

/** True when the channel-reputation stage vouched for the channel. */
export function isTrustedChannel(outcome: PipelineOutcome): boolean {
  const rep = (outcome.signals?.channel_reputation ?? {}) as ReputationSignals;
  if (rep.reputation !== "approved") return false;
  // A whitelisted channel whose live trust profile says high/critical risk is
  // not trusted for unattended approval.
  return rep.risk_level !== "critical" && rep.risk_level !== "high";
}

export function remapBacklogOutcome(
  outcome: PipelineOutcome,
  maxRisk: number = TRUSTED_AUTO_APPROVE_MAX_RISK,
): PipelineOutcome {
  const hardHit = outcome.rule_hits.some((h) => h.severity === "hard");
  const trusted = isTrustedChannel(outcome);

  let state: PipelineOutcome["final_state"];
  let why: string;

  if (hardHit || outcome.final_state === "blocked") {
    state = "blocked";
    why = hardHit
      ? `hard rule hit (${outcome.rule_hits.filter((h) => h.severity === "hard").map((h) => h.name).join(", ")})`
      : "terminal block verdict";
  } else if (trusted && outcome.risk <= maxRisk) {
    state = "auto_approved";
    why = `trusted channel with risk ${outcome.risk.toFixed(1)} <= ${maxRisk}`;
  } else {
    state = "human_review_required";
    why = trusted
      ? `trusted channel but risk ${outcome.risk.toFixed(1)} > ${maxRisk} — escalated, never rejected`
      : "no trusted-channel evidence — escalated, never rejected";
  }

  if (state === outcome.final_state) {
    return {
      ...outcome,
      signals: {
        ...outcome.signals,
        backlog_remap: { applied: false, policy: "backlog_v1", reason: why, max_risk: maxRisk },
      },
    };
  }

  return {
    ...outcome,
    final_state: state,
    reasoning: `${outcome.reasoning} [backlog policy] ${outcome.final_state} -> ${state}: ${why}.`,
    signals: {
      ...outcome.signals,
      backlog_remap: {
        applied: true,
        policy: "backlog_v1",
        pipeline_state: outcome.final_state,
        remapped_state: state,
        reason: why,
        max_risk: maxRisk,
        trusted_channel: trusted,
      },
    },
  };
}
