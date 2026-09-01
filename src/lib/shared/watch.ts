/**
 * Watch / widget companion contract.
 *
 * Mirrors the response of the `watch-companion` edge function and is the
 * reference implementation for the Swift (`HeartifyKit`) and Wear ports.
 * Keep this file and the edge function additive-only: watch apps update
 * slowly, so old binaries must keep parsing new payloads.
 */

export const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = (typeof PRAYER_ORDER)[number];

export interface WatchNextPrayer {
  name: PrayerName;
  /** UTC clock string, "HH:MM". */
  at: string;
  in_minutes: number;
  is_tomorrow: boolean;
}

export interface WatchPrayerBlock {
  method: string;
  date: string | null;
  times_utc: Partial<Record<PrayerName | 'sunrise', string>>;
  /** Caller-supplied UTC offset in minutes, echoed for display formatting. */
  tz_offset: number | null;
  next: WatchNextPrayer | null;
}

export interface WatchAccountBlock {
  streak: { current: number; longest: number; last_completed_date: string | null };
  dhikr: { count: number; target: number | null } | null;
  salah_today: { logged: string[]; remaining: PrayerName[] };
}

export interface WatchCompanionPayload {
  schema: number;
  server_time: string;
  authenticated: boolean;
  prayer: WatchPrayerBlock | null;
  account: WatchAccountBlock | null;
}

/** Minutes since midnight for an "HH:MM" clock string. */
export function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Next prayer for a complication countdown. Wraps to the first prayer of the
 * following day after Isha so the watch face never renders a blank slot.
 */
export function resolveNextPrayer(
  times: Partial<Record<string, string>>,
  nowMinutes: number,
): WatchNextPrayer | null {
  // Sorted by clock, not by canonical prayer order: the payload is in UTC, so
  // for eastern longitudes Fajr can carry the largest minute-of-day value.
  const known = PRAYER_ORDER.filter((p) => typeof times[p] === 'string')
    .map((name) => ({ name, at: times[name] as string, mins: clockToMinutes(times[name] as string) }))
    .sort((a, b) => a.mins - b.mins);
  if (known.length === 0) return null;

  const upcoming = known.find((p) => p.mins > nowMinutes);
  if (upcoming) {
    return { name: upcoming.name, at: upcoming.at, in_minutes: upcoming.mins - nowMinutes, is_tomorrow: false };
  }

  const first = known[0];
  return {
    name: first.name,
    at: first.at,
    in_minutes: 24 * 60 - nowMinutes + first.mins,
    is_tomorrow: true,
  };
}

/** Converts a UTC clock string to the caller's local clock for display. */
export function toLocalClock(hhmm: string, tzOffsetMinutes: number): string {
  const total = ((clockToMinutes(hhmm) + tzOffsetMinutes) % 1440 + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
