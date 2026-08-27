/**
 * Pure sweep mechanics for `visual-safety-sweep`.
 *
 * Deliberately free of Deno / network / Supabase APIs so the timeout and
 * partial-verdict guarantees can be exercised by the CI regression suite
 * (`src/test/visual-safety-sweep.test.ts`) instead of only in production.
 *
 * Guarantees encoded here:
 *   1. A single hung AI-gateway call can never outlive CALL_TIMEOUT_MS — it
 *      resolves to an `unchecked` fallback verdict.
 *   2. The invocation stops claiming new waves once BUDGET_MS is spent and
 *      returns whatever verdicts it already has (`truncated: true`) rather
 *      than letting the edge runtime kill it with a 504.
 *   3. Only verdicts that are not `unchecked` are applied, so timed-out rows
 *      stay claimable by the next cron tick.
 */

export type Verdict = {
  video_id: string;
  state: "clean" | "female_detected" | "music" | "flagged" | "unchecked";
  confidence: number;
  flags: string[];
};

export const CALL_TIMEOUT_MS = 20_000;
export const CONCURRENCY = 16;
/** Wall-clock budget for claiming new waves; edge hard limit is higher. */
export const BUDGET_MS = 90_000;

const VALID_STATES = ["clean", "female_detected", "music", "flagged"] as const;

export function fallbackVerdict(videoId: string, reason = "model_error"): Verdict {
  return { video_id: videoId, state: "unchecked", confidence: 0, flags: [reason] };
}

/** Parses the model's reply. Any malformed/unsafe answer degrades to `flagged`. */
export function parseVerdict(videoId: string, raw: string): Verdict {
  const match = raw?.match?.(/\{[\s\S]*\}/);
  if (!match) return fallbackVerdict(videoId, "unparseable");
  let parsed: { state?: string; confidence?: number; flags?: unknown };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return fallbackVerdict(videoId, "unparseable");
  }
  const state = (VALID_STATES as readonly string[]).includes(String(parsed.state))
    ? (parsed.state as Verdict["state"])
    : "flagged";
  return {
    video_id: videoId,
    state,
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 0) || 0)),
    flags: Array.isArray(parsed.flags) ? parsed.flags.map(String).slice(0, 6) : [],
  };
}

/**
 * Runs one classification under a hard timeout. `call` receives an AbortSignal
 * and must honour it; even if it does not, the returned promise never resolves
 * later than `timeoutMs`.
 */
export async function guardedClassify(
  videoId: string,
  call: (signal: AbortSignal) => Promise<Verdict>,
  timeoutMs: number = CALL_TIMEOUT_MS,
): Promise<Verdict> {
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Verdict>((resolve) => {
    timer = setTimeout(() => {
      ctrl.abort();
      resolve(fallbackVerdict(videoId, "timeout"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      call(ctrl.signal).catch(() => fallbackVerdict(videoId, "model_error")),
      timeout,
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export type SweepResult<T> = {
  verdicts: Verdict[];
  usable: Verdict[];
  truncated: boolean;
  skipped: T[];
};

/**
 * Classifies `items` in waves of `concurrency`, stopping before a wave that
 * would start after the budget is spent. Partial results are always returned.
 */
export async function runVisualSweep<T extends { video_id: string }>(opts: {
  items: T[];
  classify: (item: T) => Promise<Verdict>;
  concurrency?: number;
  budgetMs?: number;
  now?: () => number;
}): Promise<SweepResult<T>> {
  const { items, classify } = opts;
  const concurrency = Math.max(1, opts.concurrency ?? CONCURRENCY);
  const budgetMs = opts.budgetMs ?? BUDGET_MS;
  const now = opts.now ?? (() => Date.now());
  const deadline = now() + budgetMs;

  const verdicts: Verdict[] = [];
  let truncated = false;
  let index = 0;
  for (; index < items.length; index += concurrency) {
    if (now() > deadline) {
      truncated = true;
      break;
    }
    const slice = items.slice(index, index + concurrency);
    verdicts.push(...(await Promise.all(slice.map((it) => classify(it)))));
  }

  return {
    verdicts,
    usable: verdicts.filter((v) => v.state !== "unchecked"),
    truncated,
    skipped: truncated ? items.slice(index) : [],
  };
}

/** Tunable worker knobs, mirrored from `public.visual_scan_worker_config`. */
export type WorkerConfig = {
  enabled: boolean;
  batch_size: number;
  concurrency: number;
  max_retries: number;
  backoff_ms: number;
  call_timeout_ms: number;
  budget_ms: number;
};

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  enabled: true,
  batch_size: 40,
  concurrency: CONCURRENCY,
  max_retries: 2,
  backoff_ms: 750,
  call_timeout_ms: CALL_TIMEOUT_MS,
  budget_ms: BUDGET_MS,
};

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;
};

/** Coerces an untrusted config row into safe bounds so a bad value can never wedge the worker. */
export function normalizeWorkerConfig(row: Partial<WorkerConfig> | null | undefined): WorkerConfig {
  const d = DEFAULT_WORKER_CONFIG;
  if (!row) return { ...d };
  return {
    enabled: row.enabled !== false,
    batch_size: clamp(row.batch_size, 1, 300, d.batch_size),
    concurrency: clamp(row.concurrency, 1, 64, d.concurrency),
    max_retries: clamp(row.max_retries, 0, 5, d.max_retries),
    backoff_ms: clamp(row.backoff_ms, 100, 10_000, d.backoff_ms),
    call_timeout_ms: clamp(row.call_timeout_ms, 2_000, 60_000, d.call_timeout_ms),
    budget_ms: clamp(row.budget_ms, 10_000, 240_000, d.budget_ms),
  };
}

/** Full jitter exponential backoff delay for attempt `n` (0-based). */
export function backoffDelay(attempt: number, baseMs: number, rand: () => number = Math.random) {
  const capped = Math.min(baseMs * 2 ** attempt, 15_000);
  return Math.round(capped * (0.5 + rand() * 0.5));
}

/**
 * Retries a classification while it yields a transient `unchecked` fallback
 * (timeout, gateway 429/5xx, model error) with exponential backoff + jitter.
 * A decided verdict — including `flagged` — is returned immediately, and the
 * final fallback is returned once retries are exhausted so the row stays
 * claimable by the next tick.
 */
export async function classifyWithRetries(
  attemptFn: (attempt: number) => Promise<Verdict>,
  opts: {
    maxRetries?: number;
    backoffMs?: number;
    sleep?: (ms: number) => Promise<void>;
    rand?: () => number;
    shouldStop?: () => boolean;
  } = {},
): Promise<Verdict> {
  const maxRetries = Math.max(0, opts.maxRetries ?? DEFAULT_WORKER_CONFIG.max_retries);
  const backoffMs = opts.backoffMs ?? DEFAULT_WORKER_CONFIG.backoff_ms;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  let last = await attemptFn(0);
  for (let attempt = 0; attempt < maxRetries && last.state === "unchecked"; attempt += 1) {
    if (opts.shouldStop?.()) break;
    await sleep(backoffDelay(attempt, backoffMs, opts.rand));
    last = await attemptFn(attempt + 1);
  }
  return last;
}
