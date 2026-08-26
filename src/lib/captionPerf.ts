/**
 * Caption loading performance log.
 *
 * Caption fetches are the one thing between pressing play and being able to
 * follow a lecture in your own language, so every fetch (and prefetch) is
 * timed. Samples stay in memory — no network calls, no per-user cost — and are
 * exposed for the diagnostics page and for assertions in tests.
 */
export interface CaptionPerfSample {
  uploadId: string;
  kind: "fetch" | "prefetch" | "translate";
  languages: number;
  ms: number;
  at: number;
  cached: boolean;
}

const MAX_SAMPLES = 40;
const samples: CaptionPerfSample[] = [];

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Start a timer; call the returned function when the load settles. */
export function startCaptionTimer(uploadId: string, kind: CaptionPerfSample["kind"]) {
  const started = now();
  return (languages: number, cached = false): CaptionPerfSample => {
    const sample: CaptionPerfSample = {
      uploadId,
      kind,
      languages,
      ms: Math.round(now() - started),
      at: Date.now(),
      cached,
    };
    samples.push(sample);
    if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
    if (typeof performance !== "undefined" && "measure" in performance) {
      try {
        performance.measure(`captions:${kind}:${uploadId}`, { start: started, end: now() });
      } catch {
        /* measure is best-effort */
      }
    }
    return sample;
  };
}

export function captionPerfSamples(): readonly CaptionPerfSample[] {
  return samples;
}

export function captionPerfSummary(): { count: number; p50: number; p95: number; slowest: number } {
  if (samples.length === 0) return { count: 0, p50: 0, p95: 0, slowest: 0 };
  const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    count: sorted.length,
    p50: at(0.5),
    p95: at(0.95),
    slowest: sorted[sorted.length - 1],
  };
}

/** Test helper. */
export function resetCaptionPerf() {
  samples.length = 0;
}
