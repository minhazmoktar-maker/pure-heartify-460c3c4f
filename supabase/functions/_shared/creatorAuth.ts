/**
 * Shared helpers for the Heartify creator ecosystem edge functions.
 *
 * Native uploads are the one path where an ordinary signed-in user can put
 * media into Heartify, so every helper here is written to fail closed:
 *  - the caller's identity always comes from the bearer token (never the body)
 *  - storage access is only ever handed out as short-lived signed URLs
 *  - nothing becomes publicly servable without an explicit moderator decision
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const UPLOAD_BUCKET = "creator-uploads";

export interface CallerIdentity {
  id: string;
  email: string | null;
}

/** Service-role client. Throws if the runtime is misconfigured. */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("server misconfigured");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Resolve the signed-in caller from the Authorization header.
 * Returns null when the request carries no valid session.
 */
export async function resolveCaller(req: Request): Promise<CallerIdentity | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: auth },
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? null };
}

/** Append an immutable audit row for an upload. */
export async function logUploadEvent(
  admin: SupabaseClient,
  uploadId: string,
  event: string,
  actorId: string | null,
  actorKind: "creator" | "system" | "moderator",
  detail: Record<string, unknown> = {},
) {
  await admin.from("creator_upload_events").insert({
    upload_id: uploadId,
    actor_id: actorId,
    actor_kind: actorKind,
    event,
    detail,
  });
}

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** 2 GB ceiling — matches the bucket limit. */
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
