/**
 * Signed playback URL (`creator-media-url`) cache metrics.
 *
 * The Creator Studio review panels reuse memoised signed URLs for 45 minutes.
 * If that caching silently stops working (cache key change, TTL bug, a panel
 * remounting on every render) the only visible symptom is a slow Studio and a
 * quota bill — so the hit rate and fetch latency are measured here and alerted
 * on when effectiveness drops below a threshold.
 *
 * Counters are per-tab and in-memory: they answer "is caching working for this
 * session", not "what is the fleet-wide rate". Fan-out goes through
 * `reportAlert`, which persists to `production_alerts` server-side.
 */
import { reportAlert } from "@/lib/alerts";

export interface PlaybackUrlMetrics {
  hits: number;
  misses: number;
  /** hits / (hits + misses), or null before any lookup. */
  hitRate: number | null;
  /** Mean `creator-media-url` round trip in ms, or null before any fetch. */
  avgFetchMs: number | null;
  fetches: number;
  errors: number;
}

/** Minimum lookups before a low hit rate is meaningful (avoids 0/1 alerts). */
export const MIN_SAMPLE = 8;
/** Alert when the hit rate drops under this after MIN_SAMPLE lookups. */
export const HIT_RATE_FLOOR = 0.35;
/** Alert when signed-URL fetches get this slow on average. */
export const LATENCY_CEILING_MS = 2500;

const state = { hits: 0, misses: 0, fetches: 0, totalMs: 0, errors: 0, alerted: false };

export function resetPlaybackUrlMetrics() {
  state.hits = 0;
  state.misses = 0;
  state.fetches = 0;
  state.totalMs = 0;
  state.errors = 0;
  state.alerted = false;
  publish();
}

export function playbackUrlMetrics(): PlaybackUrlMetrics {
  const lookups = state.hits + state.misses;
  return {
    hits: state.hits,
    misses: state.misses,
    hitRate: lookups === 0 ? null : state.hits / lookups,
    avgFetchMs: state.fetches === 0 ? null : Math.round(state.totalMs / state.fetches),
    fetches: state.fetches,
    errors: state.errors,
  };
}

/** Mirrored onto `window` so E2E/QA can assert cache behaviour without hooks. */
function publish() {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>).__heartifyPlaybackUrlMetrics =
    playbackUrlMetrics();
}

export function recordPlaybackUrlCacheHit() {
  state.hits += 1;
  publish();
}

export function recordPlaybackUrlFetch(durationMs: number, ok: boolean) {
  state.misses += 1;
  state.fetches += 1;
  state.totalMs += Math.max(0, durationMs);
  if (!ok) state.errors += 1;
  publish();
  void maybeAlert();
}

async function maybeAlert() {
  if (state.alerted) return;
  const m = playbackUrlMetrics();
  const lookups = state.hits + state.misses;
  if (lookups < MIN_SAMPLE) return;
  const lowHitRate = m.hitRate !== null && m.hitRate < HIT_RATE_FLOOR;
  const slow = m.avgFetchMs !== null && m.avgFetchMs > LATENCY_CEILING_MS;
  if (!lowHitRate && !slow) return;
  state.alerted = true; // one alert per tab; the rate limiter is a second guard
  await reportAlert({
    kind: "ui_invariant",
    severity: "warn",
    message: lowHitRate
      ? `creator-media-url cache hit rate ${(m.hitRate! * 100).toFixed(0)}% below ${(HIT_RATE_FLOOR * 100).toFixed(0)}%`
      : `creator-media-url average fetch ${m.avgFetchMs}ms above ${LATENCY_CEILING_MS}ms`,
    context: { metric: "creator_media_url_cache", ...m },
  });
}
