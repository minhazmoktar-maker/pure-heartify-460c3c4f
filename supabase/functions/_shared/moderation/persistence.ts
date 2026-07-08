import type { PipelineOutcome } from "./types.ts";

/**
 * Append-only writer for moderation_decisions.
 * The DB trigger `sync_video_last_decision` propagates the summary onto
 * curated_videos — never overwrite history from application code.
 */
export async function persistDecision(
  supabaseUrl: string,
  serviceKey: string,
  outcome: PipelineOutcome,
  actor: { id?: string | null; kind: "system" | "admin" | "owner" | "recheck" | "override" },
  previousState?: string | null,
): Promise<{ id: string } | { error: string }> {
  const body = {
    video_id: outcome.video_id,
    stage: outcome.final_stage,
    state: outcome.final_state,
    confidence: outcome.confidence,
    risk: outcome.risk,
    provider: outcome.provider ?? null,
    reasoning: outcome.reasoning,
    signals: outcome.signals,
    rule_hits: outcome.rule_hits,
    actor_id: actor.id ?? null,
    actor_kind: actor.kind,
    previous_state: previousState ?? null,
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/moderation_decisions`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return { error: `persist failed ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const rows = (await res.json()) as Array<{ id: string }>;
  return { id: rows[0].id };
}
