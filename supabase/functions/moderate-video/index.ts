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



  // Every caller must be an authenticated admin/owner with approve_content.
  // Client-supplied title/description for an EXISTING video is untrusted —
  // an attacker could otherwise force-approve a real video by sending clean
  // metadata. We re-derive metadata server-side from curated_videos when a
  // row exists and only fall back to the caller-supplied fields for videos
  // not yet in our catalog (ingestion path).
  const authz = await authorize(req, "approve_content");
  if (authz instanceof Response) return authz;
  const actorId: string | null = authz.principal.id;
  let actorKind: "system" | "admin" | "owner" | "recheck" | "override" =
    authz.principal.role === "owner" ? "owner" : "admin";
  if (body.actor_kind === "recheck" || body.actor_kind === "override" || body.actor_kind === "system") {
    actorKind = body.actor_kind;
  }

  // Look up existing curated row for prev state AND authoritative metadata.
  const prevRes = await fetch(
    `${SUPABASE_URL}/rest/v1/curated_videos?video_id=eq.${encodeURIComponent(v.video_id)}&select=moderation_state,title,description,channel_title,channel_id,category,tags`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const existingRow = prevRes.ok ? ((await prevRes.json())[0] ?? null) : null;
  const prev = existingRow?.moderation_state ?? null;

  // If the video already exists in our catalog, trust our stored fields over
  // whatever the caller sent. This closes the metadata-spoofing bypass.
  const trustedVideo: VideoContext = existingRow
    ? {
        ...v,
        title: existingRow.title ?? v.title,
        description: existingRow.description ?? v.description,
        channel_title: existingRow.channel_title ?? v.channel_title,
        channel_id: existingRow.channel_id ?? v.channel_id,
        category: existingRow.category ?? v.category,
        tags: existingRow.tags ?? v.tags,
      }
    : v;

  const thresholds = await loadThresholds(SUPABASE_URL, SERVICE_KEY);
  const pipeline = defaultPipeline(SUPABASE_URL, SERVICE_KEY);
  const outcome = await runPipeline(trustedVideo, pipeline, thresholds);

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
