import { supabase } from "@/integrations/supabase/client";

export type AlertKind =
  | "permission_denied"
  | "watch_playback_failure"
  | "watch_iframe_error"
  | "network_error"
  | "unexpected_error";

export type AlertSeverity = "info" | "warn" | "error" | "critical";

interface ReportAlertOptions {
  kind: AlertKind;
  message: string;
  severity?: AlertSeverity;
  context?: Record<string, unknown>;
  route?: string;
}

// Simple in-memory rate limiter to avoid alert storms (max 5/min per kind).
const buckets = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function shouldSend(kind: string): boolean {
  const now = Date.now();
  const arr = (buckets.get(kind) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) return false;
  arr.push(now);
  buckets.set(kind, arr);
  return true;
}

export async function reportAlert(opts: ReportAlertOptions): Promise<void> {
  try {
    if (!shouldSend(opts.kind)) return;
    const { data: userRes } = await supabase.auth.getUser();
    const route = opts.route ?? (typeof window !== "undefined" ? window.location.pathname : null);
    const severity = opts.severity ?? "warn";
    const message = opts.message.slice(0, 2000);
    const context = (opts.context ?? {}) as Record<string, unknown>;

    // Route both DB persistence and fan-out through dispatch-alert
    // (service-role only insert on production_alerts).
    void supabase.functions.invoke("dispatch-alert", {
      body: {
        kind: opts.kind,
        severity,
        message,
        route,
        context,
        user_id: userRes?.user?.id ?? null,
        persist: true,
      },
    }).catch((e) => console.warn("[alerts] dispatch failed", e));
  } catch (err) {
    // Never throw from monitoring
    console.warn("[alerts] failed to report", err);
  }
}

/**
 * Wrap a Supabase error and forward permission-denied failures to the monitor.
 * Returns the same error unchanged for callers to handle normally.
 */
export function trackSupabaseError(
  error: { message?: string; code?: string } | null | undefined,
  context: { operation: string; table?: string; [k: string]: unknown },
): void {
  if (!error?.message) return;
  const msg = error.message.toLowerCase();
  if (
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    error.code === "42501"
  ) {
    void reportAlert({
      kind: "permission_denied",
      severity: "error",
      message: `${context.operation}: ${error.message}`,
      context: { ...context, code: error.code },
    });
  }
}
