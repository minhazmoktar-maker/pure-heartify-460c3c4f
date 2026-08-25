/**
 * creator-upload-submit — finalises a native upload and puts it in the
 * moderation queue.
 *
 * Verifies the object actually landed in storage, re-runs the halal text gate
 * against the current metadata, then moves the row to `pending_review`.
 * A creator can never move their own upload to `approved`.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assessStrict } from "../_shared/halalGuard.ts";
import {
  UPLOAD_BUCKET,
  adminClient,
  logUploadEvent,
  resolveCaller,
} from "../_shared/creatorAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let admin;
  try { admin = adminClient(); } catch { return json({ error: "server misconfigured" }, 500); }

  const caller = await resolveCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401);

  let body: { upload_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const uploadId = (body.upload_id ?? "").trim();
  if (!uploadId) return json({ error: "upload_id required" }, 400);

  const { data: upload } = await admin
    .from("creator_uploads")
    .select("id,user_id,title,description,status,video_path")
    .eq("id", uploadId)
    .maybeSingle();
  if (!upload) return json({ error: "not_found" }, 404);
  if (upload.user_id !== caller.id) return json({ error: "forbidden" }, 403);
  if (!["uploading", "draft", "rejected"].includes(upload.status)) {
    return json({ error: "invalid_state", status: upload.status }, 409);
  }
  if (!upload.video_path) return json({ error: "missing_video" }, 400);

  // Confirm the object exists — a client that never completed the PUT must not
  // be able to occupy the review queue.
  const folder = upload.video_path.split("/").slice(0, -1).join("/");
  const fileName = upload.video_path.split("/").pop()!;
  const { data: listed } = await admin.storage.from(UPLOAD_BUCKET).list(folder, { limit: 100 });
  const found = (listed ?? []).find((f) => f.name === fileName);
  if (!found) return json({ error: "video_not_uploaded" }, 409);

  const verdict = assessStrict(
    { title: `${upload.title} ${upload.description ?? ""}`, visual_state: "clean" },
    true,
  );
  if (!verdict.allowed) {
    await admin
      .from("creator_uploads")
      .update({ status: "rejected", visual_state: "flagged", moderation_reason: verdict.reason })
      .eq("id", upload.id);
    await logUploadEvent(admin, upload.id, "auto_rejected", null, "system", { reason: verdict.reason });
    return json({ error: "halal_rejected", reason: verdict.reason }, 422);
  }

  const { error: updErr } = await admin
    .from("creator_uploads")
    .update({
      status: "pending_review",
      visual_state: "unchecked",
      moderation_reason: null,
      size_bytes: (found as { metadata?: { size?: number } }).metadata?.size ?? null,
    })
    .eq("id", upload.id);
  if (updErr) return json({ error: "update_failed", detail: updErr.message }, 500);

  await logUploadEvent(admin, upload.id, "submitted_for_review", caller.id, "creator", {});

  return json({ ok: true, status: "pending_review" }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
