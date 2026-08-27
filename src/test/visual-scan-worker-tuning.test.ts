/**
 * CI regression: adjustable worker concurrency + safe retries.
 *
 * The sweep must keep the unchecked/eligible serving queue at zero under load,
 * which means bad config values can never wedge the worker and transient
 * gateway failures must be retried with backoff instead of burning the row.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKER_CONFIG,
  backoffDelay,
  classifyWithRetries,
  normalizeWorkerConfig,
  type Verdict,
} from "../../supabase/functions/visual-safety-sweep/sweep";

const clean = (id = "v1"): Verdict => ({ video_id: id, state: "clean", confidence: 90, flags: [] });
const transient = (id = "v1"): Verdict => ({
  video_id: id,
  state: "unchecked",
  confidence: 0,
  flags: ["timeout"],
});

describe("normalizeWorkerConfig", () => {
  it("falls back to defaults when no row exists", () => {
    expect(normalizeWorkerConfig(null)).toEqual(DEFAULT_WORKER_CONFIG);
  });

  it("clamps out-of-range and non-numeric values into safe bounds", () => {
    const cfg = normalizeWorkerConfig({
      concurrency: 9999,
      batch_size: 0,
      max_retries: -3,
      backoff_ms: 1,
      call_timeout_ms: 999_999,
      budget_ms: Number.NaN,
    } as never);
    expect(cfg.concurrency).toBe(64);
    expect(cfg.batch_size).toBe(1);
    expect(cfg.max_retries).toBe(0);
    expect(cfg.backoff_ms).toBe(100);
    expect(cfg.call_timeout_ms).toBe(60_000);
    expect(cfg.budget_ms).toBe(DEFAULT_WORKER_CONFIG.budget_ms);
  });

  it("treats only an explicit false as disabled", () => {
    expect(normalizeWorkerConfig({ enabled: false }).enabled).toBe(false);
    expect(normalizeWorkerConfig({}).enabled).toBe(true);
  });
});

describe("backoffDelay", () => {
  it("grows exponentially and stays within the jitter window", () => {
    expect(backoffDelay(0, 1000, () => 1)).toBe(1000);
    expect(backoffDelay(1, 1000, () => 1)).toBe(2000);
    expect(backoffDelay(2, 1000, () => 0)).toBe(2000); // full jitter halves it
  });

  it("caps the delay so a long outage cannot stall a tick", () => {
    expect(backoffDelay(20, 1000, () => 1)).toBe(15_000);
  });
});

describe("classifyWithRetries", () => {
  it("returns a decided verdict without retrying", async () => {
    let calls = 0;
    const v = await classifyWithRetries(async () => {
      calls += 1;
      return clean();
    }, { maxRetries: 3, sleep: async () => {} });
    expect(v.state).toBe("clean");
    expect(calls).toBe(1);
  });

  it("retries transient failures with backoff and succeeds", async () => {
    const delays: number[] = [];
    let calls = 0;
    const v = await classifyWithRetries(
      async (attempt) => {
        calls += 1;
        return attempt < 2 ? transient() : clean();
      },
      { maxRetries: 3, backoffMs: 500, rand: () => 1, sleep: async (ms) => void delays.push(ms) },
    );
    expect(v.state).toBe("clean");
    expect(calls).toBe(3);
    expect(delays).toEqual([500, 1000]);
  });

  it("gives up after maxRetries and keeps the row claimable", async () => {
    let calls = 0;
    const v = await classifyWithRetries(async () => {
      calls += 1;
      return transient();
    }, { maxRetries: 2, sleep: async () => {} });
    expect(calls).toBe(3);
    expect(v.state).toBe("unchecked");
  });

  it("stops retrying once the tick budget is spent", async () => {
    let calls = 0;
    const v = await classifyWithRetries(async () => {
      calls += 1;
      return transient();
    }, { maxRetries: 5, sleep: async () => {}, shouldStop: () => true });
    expect(calls).toBe(1);
    expect(v.state).toBe("unchecked");
  });
});
