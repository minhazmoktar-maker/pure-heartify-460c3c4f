import { track } from "@/lib/analytics";

/**
 * Pull-to-refresh instrumentation + fetch dedupe.
 *
 * - `runDedupedRefresh(key, fn)` guarantees that overlapping pull-to-refresh
 *   gestures share a single in-flight promise per key (Home vs Browse vs
 *   Section pages don't collide with each other, but a double-pull on the
 *   same surface reuses the same request).
 * - Emits `pull_to_refresh_triggered` / `pull_to_refresh_completed` /
 *   `pull_to_refresh_failed` analytics events with latency, render time,
 *   and cache-hit rate (derived from React Query's internal fetch counter
 *   when the caller supplies it).
 * - Exposes a lightweight `window.__heartifyRefreshMetrics` snapshot so we
 *   can eyeball before/after numbers from DevTools without wiring a UI.
 */

export interface RefreshMetricsSnapshot {
  triggers: number;
  completed: number;
  failed: number;
  avgLatencyMs: number;
  avgRenderMs: number;
  cacheHitRate: number; // 0..1
  lastLatencyMs: number | null;
  lastRenderMs: number | null;
  lastError: string | null;
}

const state: RefreshMetricsSnapshot = {
  triggers: 0,
  completed: 0,
  failed: 0,
  avgLatencyMs: 0,
  avgRenderMs: 0,
  cacheHitRate: 0,
  lastLatencyMs: null,
  lastRenderMs: null,
  lastError: null,
};

let latencySum = 0;
let renderSum = 0;
let cacheHits = 0;
let cacheChecks = 0;

const inflight = new Map<string, Promise<void>>();

function publish() {
  if (typeof window !== "undefined") {
    (window as unknown as { __heartifyRefreshMetrics?: RefreshMetricsSnapshot }).__heartifyRefreshMetrics = { ...state };
  }
}

export function getRefreshMetrics(): RefreshMetricsSnapshot {
  return { ...state };
}

export interface RefreshRunOptions {
  /** Called after the refresh promise resolves; measures render time. */
  cacheHit?: boolean;
}

export async function runDedupedRefresh(
  key: string,
  fn: () => Promise<RefreshRunOptions | void> | RefreshRunOptions | void,
): Promise<void> {
  const existing = inflight.get(key);
  if (existing) {
    void track("pull_to_refresh_deduped", { key });
    return existing;
  }

  state.triggers += 1;
  const startedAt = performance.now();
  void track("pull_to_refresh_triggered", { key });

  const p = (async () => {
    try {
      const res = (await fn()) || {};
      const latency = performance.now() - startedAt;
      state.lastLatencyMs = latency;
      latencySum += latency;
      state.completed += 1;
      state.avgLatencyMs = latencySum / state.completed;

      cacheChecks += 1;
      if ((res as RefreshRunOptions).cacheHit) cacheHits += 1;
      state.cacheHitRate = cacheHits / cacheChecks;

      // Measure paint-after-refresh on next frame.
      const renderStart = performance.now();
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const renderMs = performance.now() - renderStart;
      state.lastRenderMs = renderMs;
      renderSum += renderMs;
      state.avgRenderMs = renderSum / state.completed;

      state.lastError = null;
      publish();
      void track("pull_to_refresh_completed", {
        key,
        latency_ms: Math.round(latency),
        render_ms: Math.round(renderMs),
        cache_hit: !!(res as RefreshRunOptions).cacheHit,
      });
    } catch (err) {
      state.failed += 1;
      state.lastError = err instanceof Error ? err.message : String(err);
      publish();
      void track("pull_to_refresh_failed", { key, error: state.lastError });
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/** True if a refresh with the given key is currently in flight. */
export function isRefreshing(key: string): boolean {
  return inflight.has(key);
}
