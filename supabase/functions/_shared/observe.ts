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

/**
 * p95 latency budgets (ms) per function. A single breach never alerts — see
 * `SUSTAINED` below. Budgets are grouped by domain so ingestion (batch, slow by
 * design) is never held to interactive latency targets.
 */
export const LATENCY_BUDGET_MS: Record<string, number> = {
  // Interactive read paths — user-perceived latency.
  feed: 1200,
  recommendations: 1500,
  surfaces: 1500,
  search: 1000,
  "return-digest": 1500,
  // Batch / crawl paths — long runs are expected, only pathological runs page.
  "ingest-videos": 180_000,
  "discover-channels": 180_000,
  "moderate-channels": 180_000,
  "sweep-embeddable": 180_000,
  // Safety sweeps run AI-gateway calls per video; a slow gateway is expected
  // and handled by partial verdicts, so only pathological runs should page.
  "visual-safety-sweep": 240_000,
  "sweep-female-music": 180_000,
};

const DEFAULT_BUDGET_MS = 3000;

/** Domain buckets used for alert routing + the ops dashboard grouping. */
export const FN_DOMAIN: Record<string, "recommendations" | "ingestion" | "moderation" | "edge"> = {
  feed: "recommendations",
  recommendations: "recommendations",
  surfaces: "recommendations",
  search: "recommendations",
  "return-digest": "recommendations",
  "ingest-videos": "ingestion",
  "discover-channels": "ingestion",
  "moderate-channels": "ingestion",
  "sweep-embeddable": "ingestion",
  "visual-safety-sweep": "moderation",
  "sweep-female-music": "moderation",
};

/**
 * Noise controls.
 *
 * Previously every 5xx and every slow request fired an alert, which produced
 * alert storms during transient upstream (YouTube/quota) blips and during
 * normal cold starts. Alerts now require a *sustained* signal inside a rolling
 * window, and warnings are de-duplicated far more aggressively than errors.
 */
const SUSTAINED = {
  /** Rolling window of recent outcomes kept per function. */
  window: 20,
  /** Minimum samples before latency/error ratios are trusted at all. */
  minSamples: 5,
  /** Error ratio inside the window that warrants an alert. */
  errorRatio: 0.2,
  /** Consecutive failures that page immediately, regardless of ratio. */
  consecutiveErrors: 3,
  /** Share of the window over budget before a latency warning fires. */
  slowRatio: 0.3,
  /** A single request this far over budget is pathological — always warn. */
  hardLatencyMultiple: 3,
};

/** Dedupe windows: errors are actionable fast, warnings are hourly digests. */
const DEDUPE_MS: Record<"error" | "warn", number> = {
  error: 10 * 60_000,
  warn: 60 * 60_000,
};

/**
 * Transient upstream conditions that are retried by the caller and must never
 * page a human: rate limits, upstream unavailability and client aborts.
 */
const TRANSIENT_STATUS = new Set([408, 425, 429, 502, 503, 504]);
const TRANSIENT_MESSAGE =
  /quota|rate limit|too many requests|timeout|timed out|aborted|temporarily unavailable|ECONNRESET|fetch failed/i;

interface Rolling {
  outcomes: boolean[]; // true = ok
  slow: boolean[];
  consecutiveErrors: number;
}
const rolling = new Map<string, Rolling>();

function track(fn: string, ok: boolean, slow: boolean): Rolling {
  const r = rolling.get(fn) ?? { outcomes: [], slow: [], consecutiveErrors: 0 };
  r.outcomes.push(ok);
  r.slow.push(slow);
  if (r.outcomes.length > SUSTAINED.window) r.outcomes.shift();
  if (r.slow.length > SUSTAINED.window) r.slow.shift();
  r.consecutiveErrors = ok ? 0 : r.consecutiveErrors + 1;
  rolling.set(fn, r);
  return r;
}

const alertWindow = new Map<string, number>();

function shouldAlert(key: string, severity: "warn" | "error"): boolean {
  const now = Date.now();
  const last = alertWindow.get(key) ?? 0;
  if (now - last < DEDUPE_MS[severity]) return false;
  alertWindow.set(key, now);
  return true;
}

/**
 * Sampling for successful metric rows. High-volume interactive functions write
 * one row in five on success (errors and slow requests are always recorded), so
 * `function_metrics` stays queryable without losing regression signal.
 */
const SUCCESS_SAMPLE_RATE: Record<string, number> = { feed: 0.2, surfaces: 0.2, search: 0.2 };


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

      const slow = duration > budget;
      const transient =
        !ok && (TRANSIENT_STATUS.has(status) || (!!errMsg && TRANSIENT_MESSAGE.test(errMsg)));

      if (ok) {
        // Successful-but-slow requests stay at warn level in the logs so log
        // dashboards can filter them without them counting as failures.
        if (slow) log.warn("request_slow", { status, durationMs: Math.round(duration), budgetMs: budget });
        else log.info("request", { status, durationMs: Math.round(duration) });
      } else {
        const fields = { status, durationMs: Math.round(duration), err: errMsg, transient };
        if (transient) log.warn("request_transient", fields);
        else log.error("request_failed", fields);
      }

      const window = track(fnName, ok, ok && slow);
      const samples = window.outcomes.length;
      const errorRatio = samples ? window.outcomes.filter((o) => !o).length / samples : 0;
      const slowRatio = samples ? window.slow.filter(Boolean).length / samples : 0;
      const domain = FN_DOMAIN[fnName] ?? "edge";

      // Sample successful metric rows on chatty interactive functions; always
      // persist failures and budget breaches so regressions stay visible.
      const sampleRate = SUCCESS_SAMPLE_RATE[fnName] ?? 1;
      const persistMetric = !ok || slow || sampleRate >= 1 || Math.random() < sampleRate;

      const tasks: Promise<unknown>[] = [];
      if (persistMetric) {
        tasks.push(recordMetric({ fn: fnName, status, duration_ms: duration, ok, error: errMsg }));
      }

      // ── Error alerting: sustained failures only ─────────────────────────
      const errorBurst =
        !ok &&
        !transient &&
        (window.consecutiveErrors >= SUSTAINED.consecutiveErrors ||
          (samples >= SUSTAINED.minSamples && errorRatio >= SUSTAINED.errorRatio));

      // ── Latency alerting: sustained breach, or one pathological request ──
      const latencyBreach =
        ok &&
        slow &&
        ((samples >= SUSTAINED.minSamples && slowRatio >= SUSTAINED.slowRatio) ||
          duration > budget * SUSTAINED.hardLatencyMultiple);

      if (errorBurst && shouldAlert(`${fnName}:error`, "error")) {
        tasks.push(
          fireAlert(fnName, "error", errMsg ?? "request failed", {
            status,
            durationMs: Math.round(duration),
            domain,
            consecutiveErrors: window.consecutiveErrors,
            errorRatio: Number(errorRatio.toFixed(2)),
            samples,
          }),
        );
      } else if (latencyBreach && shouldAlert(`${fnName}:slow`, "warn")) {
        tasks.push(
          fireAlert(fnName, "warn", `latency ${Math.round(duration)}ms exceeded budget ${budget}ms`, {
            status,
            durationMs: Math.round(duration),
            budgetMs: budget,
            domain,
            slowRatio: Number(slowRatio.toFixed(2)),
            samples,
          }),
        );
      }


      // Fire-and-forget — never block the response on telemetry.
      void Promise.allSettled(tasks);
    }
  };
}
