/**
 * User-tunable offline download behaviour.
 *
 * Stored in localStorage so it survives reloads and is readable synchronously
 * by the download core (no async settings fetch inside a retry loop).
 */
export interface OfflineDownloadSettings {
  /** Total attempts per track, including the first one. */
  maxAttempts: number;
  /** Hard ceiling for one track's total download time (ms), retries included. */
  maxTotalMs: number;
  /** Longest single backoff pause between attempts (ms). */
  maxBackoffMs: number;
  /** Resume interrupted transfers with HTTP Range instead of restarting. */
  resume: boolean;
  /** How many tracks download at once. */
  concurrency: number;
}

export const OFFLINE_SETTINGS_DEFAULTS: OfflineDownloadSettings = {
  maxAttempts: 4,
  maxTotalMs: 180_000,
  maxBackoffMs: 8_000,
  resume: true,
  concurrency: 2,
};

/** Preset bundles surfaced in the UI. */
export const OFFLINE_PRESETS = {
  fast: { maxAttempts: 2, maxTotalMs: 60_000, maxBackoffMs: 2_000, resume: true, concurrency: 3 },
  balanced: OFFLINE_SETTINGS_DEFAULTS,
  patient: { maxAttempts: 8, maxTotalMs: 900_000, maxBackoffMs: 30_000, resume: true, concurrency: 1 },
} satisfies Record<string, OfflineDownloadSettings>;

export type OfflinePresetName = keyof typeof OFFLINE_PRESETS;

const KEY = "heartify.offlineDownload.settings";

const LIMITS = {
  maxAttempts: [1, 12],
  maxTotalMs: [15_000, 1_800_000],
  maxBackoffMs: [500, 60_000],
  concurrency: [1, 4],
} as const;

function clamp(n: number, [lo, hi]: readonly [number, number]): number {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function normalize(raw: Partial<OfflineDownloadSettings>): OfflineDownloadSettings {
  const d = OFFLINE_SETTINGS_DEFAULTS;
  return {
    maxAttempts: clamp(Number(raw.maxAttempts ?? d.maxAttempts) || d.maxAttempts, LIMITS.maxAttempts),
    maxTotalMs: clamp(Number(raw.maxTotalMs ?? d.maxTotalMs) || d.maxTotalMs, LIMITS.maxTotalMs),
    maxBackoffMs: clamp(Number(raw.maxBackoffMs ?? d.maxBackoffMs) || d.maxBackoffMs, LIMITS.maxBackoffMs),
    resume: raw.resume ?? d.resume,
    concurrency: clamp(Number(raw.concurrency ?? d.concurrency) || d.concurrency, LIMITS.concurrency),
  };
}

let cache: OfflineDownloadSettings | null = null;
const listeners = new Set<(s: OfflineDownloadSettings) => void>();

export function getOfflineSettings(): OfflineDownloadSettings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? normalize(JSON.parse(raw) as Partial<OfflineDownloadSettings>) : { ...OFFLINE_SETTINGS_DEFAULTS };
  } catch {
    cache = { ...OFFLINE_SETTINGS_DEFAULTS };
  }
  return cache;
}

export function setOfflineSettings(patch: Partial<OfflineDownloadSettings>): OfflineDownloadSettings {
  const next = normalize({ ...getOfflineSettings(), ...patch });
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage full / private mode — in-memory only */ }
  listeners.forEach((fn) => fn(next));
  return next;
}

export function resetOfflineSettings(): OfflineDownloadSettings {
  return setOfflineSettings(OFFLINE_SETTINGS_DEFAULTS);
}

export function subscribeOfflineSettings(fn: (s: OfflineDownloadSettings) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function detectPreset(s: OfflineDownloadSettings): OfflinePresetName | "custom" {
  for (const [name, preset] of Object.entries(OFFLINE_PRESETS)) {
    const p = preset as OfflineDownloadSettings;
    if (
      p.maxAttempts === s.maxAttempts &&
      p.maxTotalMs === s.maxTotalMs &&
      p.maxBackoffMs === s.maxBackoffMs &&
      p.resume === s.resume &&
      p.concurrency === s.concurrency
    ) return name as OfflinePresetName;
  }
  return "custom";
}

export const OFFLINE_SETTINGS_LIMITS = LIMITS;
