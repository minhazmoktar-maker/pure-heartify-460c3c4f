/**
 * moderate-video — runs the multi-stage moderation pipeline for a single
 * video and persists an immutable decision record. Called by:
 *   - admin UI ("re-moderate this video")
 *   - ingest-videos (per-video screen)
 *   - recheck-approved-channels (re-audit sweep)
 *   - manual override endpoint (with actor_kind=override)
 *
 * Body:
 *   { video: VideoContext, actor_kind?: "system"|"admin"|"owner"|"recheck"|"override" }
 *
 * Auth: any authenticated caller may request moderation of a video. Only
 * Admins / Owners may pass actor_kind other than "system" (audit trail
 * integrity). Manual state overrides go through a separate endpoint that
 * writes a "manual_override" decision — this function never lets a caller
 * pick a final state.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authorize } from "../_shared/authz.ts";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  defaultPipeline, loadThresholds, persistDecision, runPipeline,
  type VideoContext,
} from "../_shared/moderation/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "server misconfigured" }, 500);
  }

  let body: { video?: VideoContext; actor_kind?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const v = body.video;
  if (!v?.video_id || !v?.title) return json({ error: "video.video_id and video.title required" }, 400);

  // Rate limit — moderation is compute-heavy and calls out to AI providers.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const rlLimited = await enforceRateLimit(admin, {
    identity: getClientIdentity(req, null),
    action: "moderate-video",
    limit: 30,
    windowSeconds: 60,
  });
  if (rlLimited) return json({ error: "rate_limited" }, 429);



  // Only privileged actors may write non-system audit entries.
  let actorId: string | null = null;
  let actorKind: "system" | "admin" | "owner" | "recheck" | "override" = "system";
  if (body.actor_kind && body.actor_kind !== "system") {
    const authz = await authorize(req, "approve_content");
    if (authz instanceof Response) return authz;
    actorId = authz.principal.id;
    actorKind = authz.principal.role === "owner" ? "owner" : "admin";
    if (body.actor_kind === "recheck" || body.actor_kind === "override") {
      actorKind = body.actor_kind;
    }
  }

  const thresholds = await loadThresholds(SUPABASE_URL, SERVICE_KEY);
  const pipeline = defaultPipeline(SUPABASE_URL, SERVICE_KEY);
  const outcome = await runPipeline(v, pipeline, thresholds);

  // Look up previous state for audit continuity.
  const prevRes = await fetch(
    `${SUPABASE_URL}/rest/v1/curated_videos?video_id=eq.${encodeURIComponent(v.video_id)}&select=moderation_state`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const prev = prevRes.ok ? ((await prevRes.json())[0]?.moderation_state ?? null) : null;

  const written = await persistDecision(SUPABASE_URL, SERVICE_KEY, outcome, {
    id: actorId, kind: actorKind,
  }, prev);

  return json({ outcome, persisted: written }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
