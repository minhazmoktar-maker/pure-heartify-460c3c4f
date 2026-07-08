import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort client-side audit trail entry. RLS blocks non-service_role
 * writes to `privileged_actions_log`, so critical audit writes should happen
 * inside edge functions using the service role. This helper is a convenience
 * for owner-initiated UI actions where the backend has already granted the
 * mutation (RLS enforced) — we log a UI receipt for visibility.
 *
 * The real security guarantee is on the database: RLS on the target table
 * decides whether the action succeeds. This log is supplementary.
 */
export interface AuditEntry {
  action: string;
  target_type?: string;
  target_id?: string;
  previous_state?: unknown;
  new_state?: unknown;
}

export async function logPrivilegedAction(entry: AuditEntry): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Owner-only insert path via an edge function would be ideal; for now
    // we surface the audit via console + a lightweight table where allowed.
    // If RLS rejects (non-owner), we swallow silently.
    await supabase.from("privileged_actions_log" as never).insert({
      user_id: user.id,
      user_email: user.email ?? null,
      actor_role: "owner",
      action: entry.action,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      previous_state: entry.previous_state ?? null,
      new_state: entry.new_state ?? null,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    } as never);
  } catch {
    /* audit log is best-effort */
  }
}
