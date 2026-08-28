/**
 * Human video length from verified seconds.
 *
 * Returns null when the length has not been verified yet, so callers can hide
 * the badge instead of showing a guessed or "0:00" value.
 */
export function formatDuration(seconds?: number | null): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Rounded minutes for time-budget copy ("~18 min"). Never returns 0. */
export function totalMinutes(durations: Array<number | null | undefined>, fallbackMinutes = 6): number {
  const secs = durations.reduce<number>(
    (sum, d) => sum + (typeof d === "number" && d > 0 ? d : fallbackMinutes * 60),
    0,
  );
  return Math.max(1, Math.round(secs / 60));
}
