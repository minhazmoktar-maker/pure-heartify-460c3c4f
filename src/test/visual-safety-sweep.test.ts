/**
 * CI regression: visual-safety-sweep must write PARTIAL verdicts instead of
 * timing out when the AI gateway is slow.
 *
 * The production incident this guards: every 5-minute run returned 500/504
 * because slow gateway calls consumed the whole edge budget and nothing was
 * ever applied. The contract is now:
 *   - one slow call is aborted at CALL_TIMEOUT_MS and degrades to `unchecked`
 *   - the run stops claiming new waves at BUDGET_MS and returns `truncated`
 *   - `unchecked` rows are never applied, so they stay claimable
 */
import { describe, expect, it, vi } from "vitest";
import {
  BUDGET_MS,
  CALL_TIMEOUT_MS,
  fallbackVerdict,
  guardedClassify,
  parseVerdict,
  runVisualSweep,
  type Verdict,
} from "../../supabase/functions/visual-safety-sweep/sweep";

const items = (n: number, prefix = "v") =>
  Array.from({ length: n }, (_, i) => ({ video_id: `${prefix}${i}` }));

describe("guardedClassify — slow AI gateway", () => {
  it("aborts a hung call and returns an unchecked fallback", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const promise = guardedClassify(
      "hung",
      (signal) =>
        new Promise<Verdict>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
          // never resolves on its own
        }),
      1_000,
    );
    await vi.advanceTimersByTimeAsync(1_000);
    const verdict = await promise;
    vi.useRealTimers();

    expect(aborted).toBe(true);
    expect(verdict).toEqual({
      video_id: "hung",
      state: "unchecked",
      confidence: 0,
      flags: ["timeout"],
    });
  });

  it("returns a real verdict when the gateway answers in time", async () => {
    const verdict = await guardedClassify(
      "fast",
      async () => parseVerdict("fast", '{"state":"female_detected","confidence":97,"flags":["woman"]}'),
      1_000,
    );
    expect(verdict.state).toBe("female_detected");
    expect(verdict.confidence).toBe(97);
  });

  it("degrades gateway/network errors to unchecked, never to clean", async () => {
    const verdict = await guardedClassify("boom", async () => {
      throw new Error("ECONNRESET");
    }, 1_000);
    expect(verdict.state).toBe("unchecked");
  });

  it("keeps a sane production timeout", () => {
    expect(CALL_TIMEOUT_MS).toBeGreaterThan(0);
    expect(CALL_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
    expect(BUDGET_MS).toBeLessThan(150_000);
  });
});

describe("parseVerdict — fail-closed parsing", () => {
  it("treats unparseable replies as unchecked (retryable), not clean", () => {
    expect(parseVerdict("x", "the image seems fine").state).toBe("unchecked");
    expect(parseVerdict("x", "{not json").state).toBe("unchecked");
  });

  it("treats unknown states as flagged", () => {
    expect(parseVerdict("x", '{"state":"maybe","confidence":50}').state).toBe("flagged");
  });

  it("clamps confidence into 0..100", () => {
    expect(parseVerdict("x", '{"state":"clean","confidence":9999}').confidence).toBe(100);
    expect(parseVerdict("x", '{"state":"clean","confidence":-5}').confidence).toBe(0);
  });
});

describe("runVisualSweep — partial results under a spent budget", () => {
  it("writes the verdicts it already has and reports truncated", async () => {
    let clock = 0;
    // Each wave "costs" 40s of wall clock; budget is 90s → 3 waves start.
    const result = await runVisualSweep({
      items: items(40),
      concurrency: 8,
      budgetMs: 90_000,
      now: () => clock,
      classify: async (it) => {
        clock += 5_000;
        return parseVerdict(it.video_id, '{"state":"clean","confidence":90}');
      },
    });

    expect(result.truncated).toBe(true);
    expect(result.verdicts.length).toBeGreaterThan(0);
    expect(result.verdicts.length).toBeLessThan(40);
    // Everything not scanned is explicitly deferred for the next cron tick.
    expect(result.skipped.length).toBe(40 - result.verdicts.length);
  });

  it("never applies unchecked verdicts (timed-out rows stay claimable)", async () => {
    const result = await runVisualSweep({
      items: items(4),
      concurrency: 2,
      classify: async (it) =>
        it.video_id === "v1" || it.video_id === "v3"
          ? fallbackVerdict(it.video_id, "timeout")
          : parseVerdict(it.video_id, '{"state":"clean","confidence":88}'),
    });

    expect(result.verdicts).toHaveLength(4);
    expect(result.usable.map((v) => v.video_id)).toEqual(["v0", "v2"]);
    expect(result.usable.every((v) => v.state !== "unchecked")).toBe(true);
  });

  it("completes without truncation when the gateway is fast", async () => {
    const result = await runVisualSweep({
      items: items(16),
      concurrency: 8,
      classify: async (it) => parseVerdict(it.video_id, '{"state":"clean","confidence":95}'),
    });
    expect(result.truncated).toBe(false);
    expect(result.usable).toHaveLength(16);
    expect(result.skipped).toHaveLength(0);
  });

  it("does not blow the budget check on an empty claim", async () => {
    const result = await runVisualSweep({ items: [], classify: async () => fallbackVerdict("x") });
    expect(result).toMatchObject({ truncated: false, verdicts: [], usable: [] });
  });
});
