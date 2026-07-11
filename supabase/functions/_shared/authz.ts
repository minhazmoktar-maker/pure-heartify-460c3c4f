/**
 * Shared authorization helper for Supabase Edge Functions.
 *
 * MIRROR of the client-side permission matrix in `src/lib/permissions.ts`.
 * When adding a new permission or changing role membership, update BOTH
 * files. A regression test in the frontend verifies matrix consistency.
 *
 * Usage inside an edge function:
 *
 *   import { authorize } from "../_shared/authz.ts";
 *   const result = await authorize(req, "delete_video");
 *   if (result instanceof Response) return result; // 401 / 403
 *   const { principal } = result;
 */

export type Role = "user" | "moderator" | "admin" | "owner";

export type Permission =
  | "delete_video"
  | "restore_video"
  | "hide_video"
  | "unhide_video"
  | "archive_video"
  | "unarchive_video"
  | "feature_video"
  | "pin_video"
  | "edit_video_metadata"
  | "edit_halal_score"
  | "override_ai_decision"
  | "approve_content"
  | "reject_content"
  | "remove_from_surface"
  | "manage_channels"
  | "ban_channel"
  | "manage_categories"
  | "manage_tags"
  | "manage_users"
  | "manage_roles"
  | "manage_owners"
  | "manage_platform_settings"
  | "manage_feature_flags"
  | "manage_api_keys"
  | "access_admin_dashboard"
  | "access_owner_dashboard"
  | "view_analytics"
  | "view_audit_logs"
  | "view_moderation_history"
  | "moderate_reports";

const OWNER_ONLY: Permission[] = [
  "manage_roles",
  "manage_owners",
  "manage_platform_settings",
  "manage_feature_flags",
  "manage_api_keys",
  "access_owner_dashboard",
  "view_audit_logs",
];

const ADMIN_PLUS: Permission[] = [
  "delete_video",
  "restore_video",
  "archive_video",
  "unarchive_video",
  "feature_video",
  "pin_video",
  "edit_video_metadata",
  "edit_halal_score",
  "override_ai_decision",
  "remove_from_surface",
  "manage_channels",
  "ban_channel",
  "manage_categories",
  "manage_tags",
  "manage_users",
  "access_admin_dashboard",
  "view_analytics",
];

const MODERATOR_PLUS: Permission[] = [
  "hide_video",
  "unhide_video",
  "approve_content",
  "reject_content",
  "moderate_reports",
  "view_moderation_history",
];

const ROLE_PERMS: Record<Role, Set<Permission>> = {
  user: new Set(),
  moderator: new Set(MODERATOR_PLUS),
  admin: new Set([...MODERATOR_PLUS, ...ADMIN_PLUS]),
  owner: new Set([...MODERATOR_PLUS, ...ADMIN_PLUS, ...OWNER_ONLY]),
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function deny(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export interface Principal {
  id: string;
  email: string | null;
  role: Role;
}

export interface AuthorizeSuccess {
  principal: Principal;
}

/**
 * Verifies auth + role + permission for an edge function request.
 * Returns a Response (401/403) on denial, or a principal on success.
 */
export interface AuthorizeOptions {
  /** Require AAL2 (MFA-verified session). Denies with 403 mfa_required otherwise. */
  requireAal2?: boolean;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export async function authorize(
  req: Request,
  permission: Permission,
  options: AuthorizeOptions = {},
): Promise<Response | AuthorizeSuccess> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return deny(500, "server misconfigured");

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return deny(401, "unauthorized");

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: auth },
  });
  if (!userRes.ok) return deny(401, "unauthorized");
  const user = await userRes.json();
  if (!user?.id) return deny(401, "unauthorized");

  if (options.requireAal2) {
    const claims = decodeJwtPayload(auth.slice(7));
    const aal = (claims?.aal as string | undefined) ?? "aal1";
    if (aal !== "aal2") {
      return new Response(
        JSON.stringify({ error: "mfa_required", message: "AAL2 session required for this action" }),
        { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
  }

  const role = await resolveRole(SUPABASE_URL, SERVICE_KEY, user.id);

  if (!ROLE_PERMS[role].has(permission)) return deny(403, "forbidden");

  return {
    principal: { id: user.id, email: user.email ?? null, role },
  };
}

/**
 * Resolve the highest-ranked role for a user id. Fails closed to "user".
 * Order (highest wins): owner > admin > moderator > user.
 *
 * Exported for direct use and for unit testing.
 */
export async function resolveRole(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
): Promise<Role> {
  const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const [ownerRes, roleRes] = await Promise.all([
    fetch(
      `${supabaseUrl}/rest/v1/platform_owners?user_id=eq.${userId}&select=user_id`,
      { headers: svc },
    ),
    fetch(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${userId}&role=in.(admin,moderator)&select=role`,
      { headers: svc },
    ),
  ]);

  if (ownerRes.ok && ((await ownerRes.json()) as unknown[]).length > 0) {
    return "owner";
  }
  if (roleRes.ok) {
    const rows = (await roleRes.json()) as Array<{ role: string }>;
    if (rows.some((r) => r.role === "admin")) return "admin";
    if (rows.some((r) => r.role === "moderator")) return "moderator";
  }
  return "user";
}

export { CORS_HEADERS };
