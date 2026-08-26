/**
 * Caption loading performance log.
 *
 * Caption fetches are the one thing between pressing play and being able to
 * follow a lecture in your own language, so every fetch (and prefetch) is
 * timed together with the network class it ran on — a 900 ms load on 2G in
 * Dhaka is a very different signal from 900 ms on fibre. Samples stay in
 * memory (no network calls, no per-user cost) and are exposed for the
 * diagnostics page and for assertions in tests.
 */
export type CaptionPerfKind = "fetch" | "prefetch" | "translate";

export interface CaptionPerfSample {
  uploadId: string;
  kind: CaptionPerfKind;
  languages: number;
  ms: number;
  at: number;
  cached: boolean;
  /** `4g`, `3g`, `slow-2g`, … or `unknown` when the browser won't say. */
  network: string;
  /** Round-trip estimate in ms when the Network Information API exposes it. */
  rtt: number | null;
  saveData: boolean;
}

const MAX_SAMPLES = 60;
const samples: CaptionPerfSample[] = [];

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

interface NetworkInformationLike {
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}

function connection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

/** Current network class, safe on every browser. */
export function captionNetworkClass(): string {
  return connection()?.effectiveType ?? "unknown";
}

/** True on `slow-2g`/`2g` or when the user asked for data saving. */
export function isSlowCaptionNetwork(): boolean {
  const c = connection();
  if (!c) return false;
  return c.saveData === true || c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

/** Start a timer; call the returned function when the load settles. */
export function startCaptionTimer(uploadId: string, kind: CaptionPerfKind) {
  const started = now();
  return (languages: number, cached = false): CaptionPerfSample => {
    const c = connection();
    const sample: CaptionPerfSample = {
      uploadId,
      kind,
      languages,
      ms: Math.round(now() - started),
      at: Date.now(),
      cached,
      network: c?.effectiveType ?? "unknown",
      rtt: typeof c?.rtt === "number" ? c.rtt : null,
      saveData: c?.saveData === true,
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

export function captionPerfSummary(): {
  count: number;
  p50: number;
  p95: number;
  slowest: number;
  network: string;
} {
  if (samples.length === 0) {
    return { count: 0, p50: 0, p95: 0, slowest: 0, network: captionNetworkClass() };
  }
  const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    count: sorted.length,
    p50: at(0.5),
    p95: at(0.95),
    slowest: sorted[sorted.length - 1],
    network: captionNetworkClass(),
  };
}

/**
 * How long a caption load is *expected* to take on the current network. Drives
 * the determinate progress indicator so the bar tracks reality instead of
 * spinning at a fixed rate.
 */
export function expectedCaptionLoadMs(): number {
  switch (captionNetworkClass()) {
    case "slow-2g":
      return 6000;
    case "2g":
      return 4000;
    case "3g":
      return 2200;
    case "4g":
      return 900;
    default:
      return 1500;
  }
}

/** Test helper. */
export function resetCaptionPerf() {
  samples.length = 0;
}
