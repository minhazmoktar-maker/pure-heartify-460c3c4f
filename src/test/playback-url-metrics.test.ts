/**
 * Cache-effectiveness metrics for `creator-media-url` signed URLs.
 * A collapsing hit rate (or slow fetches) must raise a monitoring alert.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const alerts = vi.fn();
vi.mock("@/lib/alerts", () => ({
  reportAlert: (opts: unknown) => {
    alerts(opts);
    return Promise.resolve();
  },
}));

import {
  HIT_RATE_FLOOR,
  MIN_SAMPLE,
  playbackUrlMetrics,
  recordPlaybackUrlCacheHit,
  recordPlaybackUrlFetch,
  resetPlaybackUrlMetrics,
} from "@/lib/playbackUrlMetrics";

describe("playbackUrlMetrics", () => {
  beforeEach(() => {
    alerts.mockClear();
    resetPlaybackUrlMetrics();
  });

  it("starts empty", () => {
    expect(playbackUrlMetrics()).toMatchObject({ hits: 0, misses: 0, hitRate: null, avgFetchMs: null });
  });

  it("computes hit rate and average fetch latency", () => {
    recordPlaybackUrlFetch(100, true);
    recordPlaybackUrlCacheHit();
    recordPlaybackUrlCacheHit();
    recordPlaybackUrlFetch(300, true);
    const m = playbackUrlMetrics();
    expect(m.hitRate).toBeCloseTo(0.5);
    expect(m.avgFetchMs).toBe(200);
    expect(m.fetches).toBe(2);
  });

  it("alerts once when the hit rate drops below the floor", async () => {
    for (let i = 0; i < MIN_SAMPLE + 2; i++) recordPlaybackUrlFetch(50, true);
    await Promise.resolve();
    expect(playbackUrlMetrics().hitRate).toBeLessThan(HIT_RATE_FLOOR);
    expect(alerts).toHaveBeenCalledTimes(1);
    expect(alerts.mock.calls[0][0]).toMatchObject({ kind: "ui_invariant" });
  });

  it("does not alert while caching is effective", async () => {
    for (let i = 0; i < MIN_SAMPLE + 2; i++) recordPlaybackUrlCacheHit();
    recordPlaybackUrlFetch(80, true);
    await Promise.resolve();
    expect(alerts).not.toHaveBeenCalled();
  });
});
