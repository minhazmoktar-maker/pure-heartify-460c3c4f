/**
 * creator-upload-review — moderator decision on a native creator upload.
 *
 * Body: { upload_id, decision: "approve"|"reject"|"remove", visual_verified?, notes?, reason? }
 *
 * Approving requires an explicit `visual_verified: true` acknowledgement from
 * the reviewer — the DB trigger also refuses to publish a row whose
 * visual_state is not `clean`, so the halal serving floor holds even if this
 * function were bypassed.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authorize } from "../_shared/authz.ts";
import { assessStrict } from "../_shared/halalGuard.ts";
import { adminClient, logUploadEvent } from "../_shared/creatorAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let admin;
  try { admin = adminClient(); } catch { return json({ error: "server misconfigured" }, 500); }

  const authz = await authorize(req, "approve_content");
  if (authz instanceof Response) return authz;
  const reviewer = authz.principal;

  let body: {
    upload_id?: string;
    decision?: string;
    visual_verified?: boolean;
    notes?: string;
    reason?: string;
  };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const uploadId = (body.upload_id ?? "").trim();
  const decision = (body.decision ?? "").trim();
  if (!uploadId) return json({ error: "upload_id required" }, 400);
  if (!["approve", "reject", "remove"].includes(decision)) {
    return json({ error: "decision must be approve, reject or remove" }, 400);
  }

  const { data: upload } = await admin
    .from("creator_uploads")
    .select("id,user_id,creator_id,title,description,status")
    .eq("id", uploadId)
    .maybeSingle();
  if (!upload) return json({ error: "not_found" }, 404);

  const notes = (body.notes ?? "").trim().slice(0, 2000) || null;

  if (decision === "approve") {
    if (body.visual_verified !== true) {
      return json({ error: "visual_verification_required" }, 400);
    }
    const verdict = assessStrict(
      { title: `${upload.title} ${upload.description ?? ""}`, visual_state: "clean" },
      true,
    );
    if (!verdict.allowed) return json({ error: "halal_rejected", reason: verdict.reason }, 422);

    const { error } = await admin
      .from("creator_uploads")
      .update({
        status: "approved",
        visual_state: "clean",
        halal_score: 100,
        moderation_reason: null,
        review_notes: notes,
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .eq("id", upload.id);
    if (error) return json({ error: "update_failed", detail: error.message }, 500);
    await logUploadEvent(admin, upload.id, "approved", reviewer.id, "moderator", { notes });
    return json({ ok: true, status: "approved" }, 200);
  }

  const reason = (body.reason ?? "policy").trim().slice(0, 200);
  const nextStatus = decision === "remove" ? "removed" : "rejected";
  const { error } = await admin
    .from("creator_uploads")
    .update({
      status: nextStatus,
      visual_state: "flagged",
      moderation_reason: reason,
      review_notes: notes,
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      published_at: null,
    })
    .eq("id", upload.id);
  if (error) return json({ error: "update_failed", detail: error.message }, 500);

  // Strikes accumulate on the creator account; three strikes suspends them.
  const { data: account } = await admin
    .from("creator_accounts")
    .select("id,strikes")
    .eq("id", upload.creator_id)
    .maybeSingle();
  if (account) {
    const strikes = (account.strikes ?? 0) + 1;
    await admin
      .from("creator_accounts")
      .update({ strikes, status: strikes >= 3 ? "suspended" : "active" })
      .eq("id", account.id);
  }

  await logUploadEvent(admin, upload.id, nextStatus, reviewer.id, "moderator", { reason, notes });
  return json({ ok: true, status: nextStatus }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
