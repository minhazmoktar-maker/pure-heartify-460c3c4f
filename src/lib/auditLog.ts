import { supabase } from "@/integrations/supabase/client";

/**
 * Immutable audit trail writer.
 *
 * Calls the `log-privileged-action` edge function so that the caller's IP,
 * user-agent, and session identifier are captured server-side (client-supplied
 * headers would be spoofable). The edge function verifies the caller is
 * Owner or Admin and attributes the entry to their auth uid.
 *
 * This helper is best-effort — failures never block the underlying action.
 * The real authorization boundary is RLS on the target table.
 */
export interface AuditEntry {
  action: string;
  target_type?: string;
  target_id?: string;
  previous_state?: unknown;
  new_state?: unknown;
  success?: boolean;
  failure_reason?: string;
  metadata?: Record<string, unknown>;
}

export async function logPrivilegedAction(entry: AuditEntry): Promise<void> {
  try {
    await supabase.functions.invoke("log-privileged-action", { body: entry });
  } catch {
    /* audit log is best-effort */
  }
}
