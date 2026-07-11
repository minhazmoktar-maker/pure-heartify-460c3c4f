import type {
  PipelineOutcome, RuleHit, Stage, StageResult, Thresholds, VideoContext,
} from "./types.ts";

/**
 * Pipeline orchestrator.
 *
 * Runs stages in order, aggregates their signals, then applies the CURRENT
 * threshold policy to derive one final ModerationState. Stages are pure —
 * this function is the only place policy is applied, which keeps every
 * stage independently unit-testable.
 *
 * Guarantees:
 *  1. Terminal stage results short-circuit the pipeline (e.g. hard rule hit).
 *  2. Final confidence = min across non-null stage confidences (weakest link wins).
 *  3. Final risk = max across stage risks.
 *  4. Uncertain outcomes NEVER auto-approve — they escalate to
 *     ai_review_required or human_review_required.
 */
export async function runPipeline(
  ctx: VideoContext,
  stages: Stage[],
  thresholds: Thresholds,
): Promise<PipelineOutcome> {
  const stageResults: StageResult[] = [];
  const ruleHits: RuleHit[] = [];
  let terminal: StageResult | null = null;

  for (const stage of stages) {
    try {
      const r = await stage.run(ctx, thresholds);
      if (!r) continue;
      stageResults.push(r);
      if (r.rule_hits) ruleHits.push(...r.rule_hits);
      if (r.terminal) { terminal = r; break; }
    } catch (e) {
      stageResults.push({
        stage: stage.name,
        state: "human_review_required",
        confidence: 0,
        risk: 90,
        reasoning: `Stage ${stage.name} threw: ${(e as Error).message}`,
        signals: { flags: ["stage_error"] },
      });
    }
  }

  if (terminal) {
    return {
      video_id: ctx.video_id,
      final_state: terminal.state,
      final_stage: terminal.stage,
      confidence: terminal.confidence ?? 0,
      risk: terminal.risk ?? 100,
      provider: terminal.provider,
      reasoning: terminal.reasoning ?? "Terminal stage result",
      signals: aggregateSignals(stageResults),
      rule_hits: ruleHits,
      stage_results: stageResults,
    };
  }

  const confidences = stageResults.map((s) => s.confidence).filter((n): n is number => typeof n === "number");
  const risks = stageResults.map((s) => s.risk).filter((n): n is number => typeof n === "number");
  const confidence = confidences.length ? Math.min(...confidences) : 0;
  const risk = risks.length ? Math.max(...risks) : 100;

  const aggregatedFlags: string[] = stageResults.flatMap((s) => {
    const f = (s.signals as { flags?: unknown } | undefined)?.flags;
    return Array.isArray(f) ? (f as unknown[]).map(String) : [];
  });
  const finalState = decideState(confidence, risk, thresholds, ruleHits, aggregatedFlags);
  const aiResult = stageResults.find((s) => s.stage === "ai_reasoning");

  const reasoning = buildReasoning(finalState, confidence, risk, stageResults);

  return {
    video_id: ctx.video_id,
    final_state: finalState,
    final_stage: aiResult ? "ai_reasoning" : stageResults[stageResults.length - 1]?.stage ?? "ingest",
    confidence,
    risk,
    provider: aiResult?.provider,
    reasoning,
    signals: aggregateSignals(stageResults),
    rule_hits: ruleHits,
    stage_results: stageResults,
  };
}

/**
 * Policy function — the single place where thresholds become a state.
 * Conservative by design: uncertainty escalates, never auto-approves.
 */
export function decideState(
  confidence: number,
  risk: number,
  t: Thresholds,
  ruleHits: RuleHit[],
  flags: string[] = [],
): PipelineOutcome["final_state"] {
  if (ruleHits.some((h) => h.severity === "hard")) return "blocked";
  // Adversarial / low-quality / stage-error output — never reject silently, always escalate.
  if (
    flags.includes("prompt_injection_attempt") ||
    flags.includes("parse_failed") ||
    flags.includes("low_quality_reasoning") ||
    flags.includes("stage_error")
  ) {
    return "human_review_required";
  }
  if (confidence < t.reject_below_confidence) return "rejected";
  if (confidence >= t.auto_approve_min_confidence && risk <= t.auto_approve_max_risk) {
    return "auto_approved";
  }
  if (confidence >= t.ai_review_min_confidence) return "ai_review_required";
  if (confidence >= t.human_review_min_confidence) return "human_review_required";
  return "rejected";
}

function aggregateSignals(results: StageResult[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of results) {
    if (r.signals) out[r.stage] = r.signals;
  }
  return out;
}

function buildReasoning(
  state: string, confidence: number, risk: number, results: StageResult[],
): string {
  const parts = [`Final: ${state} (confidence ${confidence.toFixed(1)}, risk ${risk.toFixed(1)}).`];
  for (const r of results) {
    if (r.reasoning) parts.push(`[${r.stage}] ${r.reasoning}`);
  }
  return parts.join(" ");
}
