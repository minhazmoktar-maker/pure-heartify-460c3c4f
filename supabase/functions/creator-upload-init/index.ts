/**
 * creator-upload-init — starts a native creator upload.
 *
 * Flow: the client posts metadata, we screen the text against the halal guard
 * BEFORE any bytes are accepted, create the `creator_uploads` row in
 * `uploading` state, and hand back short-lived signed upload URLs for the
 * video and (optional) thumbnail. Storage stays private; no storage.objects
 * policy is needed because the tokens are minted here with the service role.
 *
 * Auth: any signed-in user with an active creator account.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assessStrict } from "../_shared/halalGuard.ts";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_BYTES,
  UPLOAD_BUCKET,
  adminClient,
  logUploadEvent,
  resolveCaller,
} from "../_shared/creatorAuth.ts";

interface Body {
  title?: string;
  description?: string;
  language?: string;
  category?: string;
  content_type?: string;
  size_bytes?: number;
  duration_seconds?: number;
  thumbnail_content_type?: string;
}

const LANGS = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let admin;
  try { admin = adminClient(); } catch { return json({ error: "server misconfigured" }, 500); }

  const caller = await resolveCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401);

  const limited = await enforceRateLimit(admin, {
    identity: getClientIdentity(req, caller.id),
    action: "creator-upload-init",
    limit: 12,
    windowSeconds: 3600,
  });
  if (limited) return json({ error: "rate_limited", message: "Upload limit reached, try again later." }, 429);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  const language = (body.language ?? "en").trim();
  const category = (body.category ?? "").trim() || null;
  const contentType = (body.content_type ?? "").trim();
  const sizeBytes = Number(body.size_bytes ?? 0);
  const duration = body.duration_seconds != null ? Math.round(Number(body.duration_seconds)) : null;
  const thumbType = (body.thumbnail_content_type ?? "").trim();

  const errors: string[] = [];
  if (title.length < 3 || title.length > 160) errors.push("title must be 3-160 characters");
  if (description.length > 5000) errors.push("description must be under 5000 characters");
  if (!LANGS.test(language)) errors.push("language must be a BCP-47 code such as bn or en");
  if (!ALLOWED_VIDEO_TYPES.has(contentType)) errors.push("video must be mp4, mov, m4v or webm");
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_VIDEO_BYTES) errors.push("video must be under 2GB");
  if (duration != null && (!Number.isFinite(duration) || duration <= 0 || duration > 6 * 3600)) errors.push("duration is invalid");
  if (thumbType && !ALLOWED_IMAGE_TYPES.has(thumbType)) errors.push("thumbnail must be jpeg, png or webp");
  if (errors.length) return json({ error: "validation_failed", details: errors }, 400);

  // Creator account must exist and be in good standing.
  const { data: account } = await admin
    .from("creator_accounts")
    .select("id,status,strikes")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (!account) return json({ error: "no_creator_account" }, 403);
  if (account.status !== "active") return json({ error: "creator_suspended" }, 403);

  // Halal text gate runs before we accept a single byte. visual_state is
  // passed as "clean" here only so the guard evaluates the TEXT rules; the
  // real visual verification happens during review.
  const verdict = assessStrict({ title: `${title} ${description}`, visual_state: "clean" }, true);
  if (!verdict.allowed) {
    const { data: rejected } = await admin
      .from("creator_uploads")
      .insert({
        creator_id: account.id,
        user_id: caller.id,
        title,
        description: description || null,
        language,
        category,
        status: "rejected",
        visual_state: "flagged",
        moderation_reason: verdict.reason ?? "halal_text",
      })
      .select("id")
      .single();
    if (rejected) {
      await logUploadEvent(admin, rejected.id, "auto_rejected", null, "system", {
        reason: verdict.reason,
        tier: verdict.tier,
      });
    }
    return json(
      {
        error: "halal_rejected",
        reason: verdict.reason,
        message:
          "This title or description conflicts with Heartify's halal content policy. Please revise and try again.",
      },
      422,
    );
  }

  const { data: upload, error: insertErr } = await admin
    .from("creator_uploads")
    .insert({
      creator_id: account.id,
      user_id: caller.id,
      title,
      description: description || null,
      language,
      category,
      status: "uploading",
      size_bytes: sizeBytes,
      duration_seconds: duration,
    })
    .select("id,status")
    .single();
  if (insertErr || !upload) return json({ error: "insert_failed", detail: insertErr?.message }, 500);

  // Trigger-level guard can flip the row straight to rejected.
  if (upload.status === "rejected") {
    return json({ error: "halal_rejected", message: "Content policy check failed." }, 422);
  }

  const ext = contentType === "video/webm" ? "webm" : contentType === "video/quicktime" ? "mov" : "mp4";
  const videoPath = `${caller.id}/${upload.id}/source.${ext}`;
  const thumbPath = thumbType
    ? `${caller.id}/${upload.id}/thumb.${thumbType === "image/png" ? "png" : thumbType === "image/webp" ? "webp" : "jpg"}`
    : null;

  const { data: videoSigned, error: signErr } = await admin.storage
    .from(UPLOAD_BUCKET)
    .createSignedUploadUrl(videoPath);
  if (signErr || !videoSigned) return json({ error: "sign_failed", detail: signErr?.message }, 500);

  let thumbSigned: { path: string; token: string } | null = null;
  if (thumbPath) {
    const { data } = await admin.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(thumbPath);
    if (data) thumbSigned = { path: data.path, token: data.token };
  }

  await admin
    .from("creator_uploads")
    .update({ video_path: videoPath, thumbnail_path: thumbPath })
    .eq("id", upload.id);

  await logUploadEvent(admin, upload.id, "upload_started", caller.id, "creator", {
    size_bytes: sizeBytes,
    content_type: contentType,
  });

  return json({
    upload_id: upload.id,
    bucket: UPLOAD_BUCKET,
    video: { path: videoSigned.path, token: videoSigned.token },
    thumbnail: thumbSigned,
  }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
