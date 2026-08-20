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
export const CONCURRENCY = 8;
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
