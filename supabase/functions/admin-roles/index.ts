/**
 * admin-roles — Owner-only role & MFA management surface.
 *
 * Actions (POST body { action, ...params }):
 *   - list_users(query?, limit?): search users by email (uses auth.admin)
 *   - list_admins(): list all rows in user_roles + platform_owners
 *   - assign_role(user_id, role): insert into user_roles ('admin' or 'moderator')
 *   - revoke_role(user_id, role): delete from user_roles
 *   - grant_owner(user_id): insert into platform_owners
 *   - revoke_owner(user_id): delete from platform_owners
 *   - list_mfa(user_id): list auth factors for user
 *   - unenroll_mfa(user_id, factor_id): remove a factor
 *   - list_audit(limit?): recent privileged_actions_log entries
 *   - list_moderation(limit?): recent moderation_log entries
 */

import { authorize, CORS_HEADERS } from "../_shared/authz.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const svcHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...svcHeaders, ...(init.headers || {}) },
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(`[${r.status}] ${text}`);
  return data;
}

async function adminApi(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    ...init,
    headers: { ...svcHeaders, ...(init.headers || {}) },
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(`[${r.status}] ${text}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Owner-only surface (manage_roles permission is owner-only)
  const authResult = await authorize(req, "manage_roles");
  if (authResult instanceof Response) return authResult;
  const { principal } = authResult;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const action = String(body.action || "");

  try {
    switch (action) {
      case "list_users": {
        const q = String(body.query || "").trim().toLowerCase();
        const page = await adminApi(`users?per_page=100&page=1`);
        const users = (page?.users || []).filter((u: { email?: string }) =>
          !q || (u.email || "").toLowerCase().includes(q)
        ).map((u: { id: string; email?: string; created_at?: string; last_sign_in_at?: string }) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }));
        return json({ users });
      }
      case "list_admins": {
        const [roles, owners] = await Promise.all([
          rest(`user_roles?select=user_id,role`),
          rest(`platform_owners?select=user_id,email,notes,created_at`),
        ]);
        return json({ roles, owners });
      }
      case "assign_role": {
        const user_id = String(body.user_id);
        const role = String(body.role);
        if (!["admin", "moderator", "user"].includes(role)) {
          return json({ error: "invalid role" }, 400);
        }
        await rest(`user_roles`, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ user_id, role }),
        });
        await auditLog(principal, "assign_role", { user_id, role });
        return json({ ok: true });
      }
      case "revoke_role": {
        const user_id = String(body.user_id);
        const role = String(body.role);
        await rest(`user_roles?user_id=eq.${user_id}&role=eq.${role}`, {
          method: "DELETE",
        });
        await auditLog(principal, "revoke_role", { user_id, role });
        return json({ ok: true });
      }
      case "grant_owner": {
        const user_id = String(body.user_id);
        const email = body.email ? String(body.email) : null;
        await rest(`platform_owners`, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ user_id, email }),
        });
        await auditLog(principal, "grant_owner", { user_id });
        return json({ ok: true });
      }
      case "revoke_owner": {
        const user_id = String(body.user_id);
        if (user_id === principal.id) {
          return json({ error: "cannot revoke your own owner status" }, 400);
        }
        await rest(`platform_owners?user_id=eq.${user_id}`, { method: "DELETE" });
        await auditLog(principal, "revoke_owner", { user_id });
        return json({ ok: true });
      }
      case "list_mfa": {
        const user_id = String(body.user_id);
        const data = await adminApi(`users/${user_id}/factors`);
        return json({ factors: data?.factors || data || [] });
      }
      case "unenroll_mfa": {
        const user_id = String(body.user_id);
        const factor_id = String(body.factor_id);
        await adminApi(`users/${user_id}/factors/${factor_id}`, { method: "DELETE" });
        await auditLog(principal, "unenroll_mfa", { user_id, factor_id });
        return json({ ok: true });
      }
      case "list_audit": {
        const limit = Math.min(Number(body.limit) || 100, 500);
        const rows = await rest(
          `privileged_actions_log?select=*&order=created_at.desc&limit=${limit}`,
        );
        return json({ rows });
      }
      case "list_moderation": {
        const limit = Math.min(Number(body.limit) || 100, 500);
        const rows = await rest(
          `moderation_log?select=*&order=created_at.desc&limit=${limit}`,
        );
        return json({ rows });
      }
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    console.error("admin-roles error:", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});

async function auditLog(
  principal: { id: string; email: string | null; role: string },
  action: string,
  metadata: Record<string, unknown>,
) {
  try {
    await rest(`privileged_actions_log`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: principal.id,
        user_email: principal.email,
        actor_role: principal.role,
        action,
        target_type: "user",
        target_id: metadata.user_id ?? null,
        metadata,
        success: true,
      }),
    });
  } catch (e) {
    console.error("audit log failed:", e);
  }
}
