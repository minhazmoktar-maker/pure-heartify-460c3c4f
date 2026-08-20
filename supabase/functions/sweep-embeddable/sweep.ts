/**
 * Pure loop mechanics for `sweep-embeddable`.
 *
 * Kept free of Deno / network APIs so CI can prove the quota-exhaustion
 * contract (`src/test/sweep-embeddable.test.ts`):
 *
 *   1. A YouTube 403 quota error stops the run immediately — no further
 *      YouTube calls, no hundreds of identical error logs.
 *   2. When a batch cannot be classified, NOTHING is written for it: rows keep
 *      their old `embed_checked_at`, so they stay first in line for the next
 *      run and are never silently left "processed but unchecked".
 *   3. The run reports `quotaExhausted` + a `stopReason` so on-call can tell a
 *      quota stop apart from an empty corpus.
 */

export type StatusResult = {
  /** video_id → playable. `null` when the batch could not be classified. */
  map: Map<string, boolean> | null;
  quotaExhausted?: boolean;
};

export type StopReason = "completed" | "exhausted_corpus" | "quota" | "yt_error" | "fetch_error";

export type EmbedSweepResult = {
  checked: number;
  hidden: number;
  batchesRun: number;
  quotaExhausted: boolean;
  /** Batch ids fetched but intentionally left unwritten (re-claimed next run). */
  deferred: string[];
  stopReason: StopReason;
};

/** True for the non-transient "quota exceeded" family of YouTube errors. */
export function isQuotaError(status: number, body: string): boolean {
  return status === 403 && /quota/i.test(body ?? "");
}

export async function runEmbedSweep(opts: {
  batches: number;
  /** Oldest-checked candidate ids, empty array when the corpus is exhausted. */
  fetchBatch: () => Promise<string[] | null>;
  ytStatus: (ids: string[]) => Promise<StatusResult>;
  markGood: (ids: string[]) => Promise<void>;
  markBad: (ids: string[]) => Promise<boolean>;
}): Promise<EmbedSweepResult> {
  let checked = 0;
  let hidden = 0;
  let batchesRun = 0;
  let quotaExhausted = false;
  const deferred: string[] = [];
  let stopReason: StopReason = "completed";

  for (let b = 0; b < opts.batches; b++) {
    const ids = await opts.fetchBatch();
    if (ids === null) {
      stopReason = "fetch_error";
      break;
    }
    if (!ids.length) {
      stopReason = "exhausted_corpus";
      break;
    }
    batchesRun++;

    const status = await opts.ytStatus(ids);
    if (!status.map) {
      // Nothing verified → write nothing. These ids stay claimable.
      deferred.push(...ids);
      quotaExhausted = quotaExhausted || !!status.quotaExhausted;
      stopReason = status.quotaExhausted ? "quota" : "yt_error";
      break;
    }
    quotaExhausted = quotaExhausted || !!status.quotaExhausted;

    const bad = ids.filter((id) => status.map!.get(id) === false);
    const good = ids.filter((id) => status.map!.get(id) !== false);
    checked += ids.length;

    if (good.length) await opts.markGood(good);
    if (bad.length && (await opts.markBad(bad))) hidden += bad.length;
  }

  return { checked, hidden, batchesRun, quotaExhausted, deferred, stopReason };
}
