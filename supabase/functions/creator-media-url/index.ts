/**
 * creator-media-url — mints a short-lived signed playback URL for a native
 * creator upload.
 *
 * Public (including signed-out) callers only ever get URLs for uploads that
 * are `approved` AND visually verified `clean`. Owners and moderators can also
 * fetch their own pending uploads for preview / review.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveRole } from "../_shared/authz.ts";
import { UPLOAD_BUCKET, adminClient, resolveCaller } from "../_shared/creatorAuth.ts";

const TTL_SECONDS = 60 * 60; // 1 hour — long enough for a full watch session.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let admin;
  try { admin = adminClient(); } catch { return json({ error: "server misconfigured" }, 500); }

  let body: { upload_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const uploadId = (body.upload_id ?? "").trim();
  if (!uploadId) return json({ error: "upload_id required" }, 400);

  const { data: upload } = await admin
    .from("creator_uploads")
    .select("id,user_id,status,visual_state,video_path,thumbnail_path")
    .eq("id", uploadId)
    .maybeSingle();
  if (!upload || !upload.video_path) return json({ error: "not_found" }, 404);

  const publiclyServable = upload.status === "approved" && upload.visual_state === "clean";

  if (!publiclyServable) {
    const caller = await resolveCaller(req);
    if (!caller) return json({ error: "not_found" }, 404);
    if (caller.id !== upload.user_id) {
      const url = Deno.env.get("SUPABASE_URL")!;
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const role = await resolveRole(url, key, caller.id);
      if (role !== "moderator" && role !== "admin" && role !== "owner") {
        return json({ error: "not_found" }, 404);
      }
    }
  }

  const { data: signed, error } = await admin.storage
    .from(UPLOAD_BUCKET)
    .createSignedUrl(upload.video_path, TTL_SECONDS);
  if (error || !signed) return json({ error: "sign_failed", detail: error?.message }, 500);

  let thumbnailUrl: string | null = null;
  if (upload.thumbnail_path) {
    const { data: thumb } = await admin.storage
      .from(UPLOAD_BUCKET)
      .createSignedUrl(upload.thumbnail_path, TTL_SECONDS);
    thumbnailUrl = thumb?.signedUrl ?? null;
  }

  if (publiclyServable) {
    await admin.rpc("bump_creator_upload_view", { p_upload_id: upload.id });
  }

  return json({ url: signed.signedUrl, thumbnail_url: thumbnailUrl, expires_in: TTL_SECONDS }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
