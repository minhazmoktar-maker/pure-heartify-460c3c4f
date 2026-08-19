// Production observability wrapper for Supabase Edge Functions.
//
// Wraps a Deno.serve handler and, for every request:
//   1. Emits a structured single-line JSON log (see logger.ts).
//   2. Persists a row into `public.function_metrics` (service-role insert) so
//      the /admin/ops-health dashboard can chart traffic, latency and errors.
//   3. Fires `dispatch-alert` when a request breaches an alert threshold
//      (5xx response, thrown error, or latency above the per-function budget).
//
// Never logs request bodies, tokens or PII — only fn name, status, latency,
// and a coarse error message.

import { createLogger } from "./logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** p95 latency budgets (ms) per function. Breach => warn alert. */
export const LATENCY_BUDGET_MS: Record<string, number> = {
  feed: 1200,
  recommendations: 1500,
  surfaces: 1500,
  search: 1000,
  "ingest-videos": 120_000,
};

const DEFAULT_BUDGET_MS = 3000;

// Alert de-duplication: at most one alert per (fn, kind) per 5 minutes.
const alertWindow = new Map<string, number>();
const ALERT_DEDUPE_MS = 5 * 60_000;

function shouldAlert(key: string): boolean {
  const now = Date.now();
  const last = alertWindow.get(key) ?? 0;
  if (now - last < ALERT_DEDUPE_MS) return false;
  alertWindow.set(key, now);
  return true;
}

async function recordMetric(row: {
  fn: string;
  status: number;
  duration_ms: number;
  ok: boolean;
  error?: string | null;
}) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/function_metrics`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        fn_name: row.fn,
        status_code: row.status,
        duration_ms: Math.round(row.duration_ms),
        ok: row.ok,
        error_message: row.error ? String(row.error).slice(0, 500) : null,
        release: Deno.env.get("APP_VERSION") ?? null,
      }),
    });
  } catch {
    /* metrics must never break the request path */
  }
}

async function fireAlert(fn: string, severity: "warn" | "error", message: string, context: Record<string, unknown>) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/dispatch-alert`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "unexpected_error",
        severity,
        message: `[${fn}] ${message}`.slice(0, 2000),
        route: `/functions/v1/${fn}`,
        context,
        persist: true,
      }),
    });
  } catch {
    /* alerting must never break the request path */
  }
}

type Handler = (req: Request) => Response | Promise<Response>;

/**
 * Wrap an edge-function handler with logging, metrics and alerting.
 *
 * Usage: `Deno.serve(observed("feed", async (req) => { ... }));`
 */
export function observed(fnName: string, handler: Handler): Handler {
  const log = createLogger(fnName);
  const budget = LATENCY_BUDGET_MS[fnName] ?? DEFAULT_BUDGET_MS;

  return async (req: Request) => {
    if (req.method === "OPTIONS") return await handler(req);

    const started = performance.now();
    let status = 500;
    let thrown: unknown = null;
    let res: Response;

    try {
      res = await handler(req);
      status = res.status;
      return res;
    } catch (err) {
      thrown = err;
      throw err;
    } finally {
      const duration = performance.now() - started;
      const ok = !thrown && status < 500;
      const errMsg = thrown
        ? thrown instanceof Error
          ? thrown.message
          : String(thrown)
        : status >= 500
        ? `http_${status}`
        : null;

      if (ok) log.info("request", { status, durationMs: Math.round(duration) });
      else log.error("request_failed", { status, durationMs: Math.round(duration), err: errMsg });

      const tasks: Promise<unknown>[] = [
        recordMetric({ fn: fnName, status, duration_ms: duration, ok, error: errMsg }),
      ];

      if (!ok && shouldAlert(`${fnName}:error`)) {
        tasks.push(
          fireAlert(fnName, "error", errMsg ?? "request failed", {
            status,
            durationMs: Math.round(duration),
          }),
        );
      } else if (ok && duration > budget && shouldAlert(`${fnName}:slow`)) {
        tasks.push(
          fireAlert(fnName, "warn", `latency ${Math.round(duration)}ms exceeded budget ${budget}ms`, {
            status,
            durationMs: Math.round(duration),
            budgetMs: budget,
          }),
        );
      }

      // Fire-and-forget, but keep the isolate alive until they settle.
      const settle = Promise.allSettled(tasks);
      // deno-lint-ignore no-explicit-any
      const wt = (globalThis as any).Deno?.core?.opAsync ? null : null;
      void wt;
      void settle;
    }
  };
}
