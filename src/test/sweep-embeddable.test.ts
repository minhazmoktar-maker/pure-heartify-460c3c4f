/**
 * CI regression: sweep-embeddable must stop CLEANLY when the YouTube Data API
 * daily quota is exhausted — and must not leave videos in a half-processed
 * state (marked checked without ever being verified).
 *
 * Production incident: quota exhaustion produced hundreds of identical 403
 * errors per run and the loop kept fetching batches it could not classify.
 */
import { describe, expect, it, vi } from "vitest";
import {
  isQuotaError,
  runEmbedSweep,
  type StatusResult,
} from "../../supabase/functions/sweep-embeddable/sweep";

const ids = (n: number, prefix = "y") => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const allGood = (batch: string[]): StatusResult => ({
  map: new Map(batch.map((id) => [id, true])),
});

describe("isQuotaError", () => {
  it("recognises the YouTube quota family", () => {
    expect(isQuotaError(403, '{"error":{"errors":[{"reason":"quotaExceeded"}]}}')).toBe(true);
    expect(isQuotaError(403, "The request cannot be completed because you have exceeded your quota."))
      .toBe(true);
  });

  it("does not misclassify other failures as quota", () => {
    expect(isQuotaError(403, "forbidden: referer restriction")).toBe(false);
    expect(isQuotaError(500, "quota")).toBe(false);
    expect(isQuotaError(400, "")).toBe(false);
  });
});

describe("runEmbedSweep — quota exhaustion", () => {
  it("stops after the first quota error and makes no further YouTube calls", async () => {
    const fetchBatch = vi.fn(async () => ids(50));
    const ytStatus = vi.fn(async (): Promise<StatusResult> => ({ map: null, quotaExhausted: true }));
    const markGood = vi.fn(async () => {});
    const markBad = vi.fn(async () => true);

    const result = await runEmbedSweep({ batches: 40, fetchBatch, ytStatus, markGood, markBad });

    expect(ytStatus).toHaveBeenCalledTimes(1);
    expect(fetchBatch).toHaveBeenCalledTimes(1);
    expect(result.quotaExhausted).toBe(true);
    expect(result.stopReason).toBe("quota");
  });

  it("leaves no video half-processed: nothing is written for an unverified batch", async () => {
    const markGood = vi.fn(async () => {});
    const markBad = vi.fn(async () => true);

    const result = await runEmbedSweep({
      batches: 10,
      fetchBatch: async () => ids(50),
      ytStatus: async () => ({ map: null, quotaExhausted: true }),
      markGood,
      markBad,
    });

    // No PATCH of embed_checked_at → the same rows are first in line next run.
    expect(markGood).not.toHaveBeenCalled();
    expect(markBad).not.toHaveBeenCalled();
    expect(result.checked).toBe(0);
    expect(result.hidden).toBe(0);
    expect(result.deferred).toHaveLength(50);
    expect(new Set(result.deferred).size).toBe(50);
  });

  it("keeps the work done before quota ran out, then defers the rest", async () => {
    let call = 0;
    const marked: string[] = [];
    const result = await runEmbedSweep({
      batches: 10,
      fetchBatch: async () => ids(50, `b${call}_`),
      ytStatus: async (batch) => {
        call++;
        if (call <= 2) return allGood(batch);
        return { map: null, quotaExhausted: true };
      },
      markGood: async (good) => {
        marked.push(...good);
      },
      markBad: async () => true,
    });

    expect(result.checked).toBe(100);
    expect(marked).toHaveLength(100);
    expect(result.deferred).toHaveLength(50);
    expect(result.quotaExhausted).toBe(true);
    expect(result.stopReason).toBe("quota");
  });

  it("distinguishes a quota stop from an exhausted corpus", async () => {
    const result = await runEmbedSweep({
      batches: 5,
      fetchBatch: async () => [],
      ytStatus: async (b) => allGood(b),
      markGood: async () => {},
      markBad: async () => true,
    });
    expect(result.stopReason).toBe("exhausted_corpus");
    expect(result.quotaExhausted).toBe(false);
    expect(result.deferred).toHaveLength(0);
  });

  it("stops on a non-quota YouTube failure without flagging quota", async () => {
    const result = await runEmbedSweep({
      batches: 5,
      fetchBatch: async () => ids(50),
      ytStatus: async () => ({ map: null, quotaExhausted: false }),
      markGood: async () => {},
      markBad: async () => true,
    });
    expect(result.stopReason).toBe("yt_error");
    expect(result.quotaExhausted).toBe(false);
    expect(result.deferred).toHaveLength(50);
  });

  it("stops on a database fetch failure and writes nothing", async () => {
    const markGood = vi.fn(async () => {});
    const result = await runEmbedSweep({
      batches: 5,
      fetchBatch: async () => null,
      ytStatus: async (b) => allGood(b),
      markGood,
      markBad: async () => true,
    });
    expect(result.stopReason).toBe("fetch_error");
    expect(result.batchesRun).toBe(0);
    expect(markGood).not.toHaveBeenCalled();
  });

  it("hides only the non-playable ids on a healthy run", async () => {
    const hiddenIds: string[] = [];
    const checkedIds: string[] = [];
    let done = false;
    const result = await runEmbedSweep({
      batches: 3,
      fetchBatch: async () => {
        if (done) return [];
        done = true;
        return ["ok1", "bad1", "ok2", "bad2"];
      },
      ytStatus: async (batch) => ({
        map: new Map(batch.map((id) => [id, !id.startsWith("bad")])),
      }),
      markGood: async (g) => void checkedIds.push(...g),
      markBad: async (b) => {
        hiddenIds.push(...b);
        return true;
      },
    });

    expect(checkedIds).toEqual(["ok1", "ok2"]);
    expect(hiddenIds).toEqual(["bad1", "bad2"]);
    expect(result.hidden).toBe(2);
    expect(result.checked).toBe(4);
    expect(result.stopReason).toBe("exhausted_corpus");
  });

  it("does not count hidden rows when the hide write fails", async () => {
    let once = false;
    const result = await runEmbedSweep({
      batches: 2,
      fetchBatch: async () => (once ? [] : ((once = true), ["bad1"])),
      ytStatus: async (batch) => ({ map: new Map(batch.map((id) => [id, false])) }),
      markGood: async () => {},
      markBad: async () => false,
    });
    expect(result.hidden).toBe(0);
    expect(result.checked).toBe(1);
  });
});
