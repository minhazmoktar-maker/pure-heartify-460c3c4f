/**
 * Centralized Intl helpers so every screen formats numbers, dates, lists,
 * relative time, currency, and Hijri dates consistently across 150+ locales.
 * Prefer these over ad-hoc `toLocaleString()` calls.
 */

const memo = new Map<string, Intl.Format>();

type FormatCtor =
  | typeof Intl.NumberFormat
  | typeof Intl.DateTimeFormat
  | typeof Intl.ListFormat
  | typeof Intl.RelativeTimeFormat;

function cached<T extends Intl.Format>(
  Ctor: FormatCtor,
  key: string,
  locale: string,
  options?: object,
): T {
  const cacheKey = `${Ctor.name}|${locale}|${key}`;
  const hit = memo.get(cacheKey);
  if (hit) return hit as T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inst = new (Ctor as any)(locale, options);
  memo.set(cacheKey, inst);
  return inst as T;
}

export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions) {
  return cached<Intl.NumberFormat>(
    Intl.NumberFormat,
    JSON.stringify(options ?? {}),
    locale,
    options,
  ).format(value);
}

export function formatCurrency(
  value: number,
  locale: string,
  currency: string,
  options?: Intl.NumberFormatOptions,
) {
  const opts = { style: "currency" as const, currency, ...(options ?? {}) };
  return cached<Intl.NumberFormat>(
    Intl.NumberFormat,
    JSON.stringify(opts),
    locale,
    opts,
  ).format(value);
}

export function formatDate(
  value: Date | number | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const d = value instanceof Date ? value : new Date(value);
  return cached<Intl.DateTimeFormat>(
    Intl.DateTimeFormat,
    JSON.stringify(options ?? {}),
    locale,
    options,
  ).format(d);
}

/** Hijri (Umm al-Qura) date; falls back to gregorian on unsupported browsers. */
export function formatHijri(
  value: Date | number | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const d = value instanceof Date ? value : new Date(value);
  const loc = locale.includes("-u-ca-") ? locale : `${locale}-u-ca-islamic-umalqura`;
  try {
    return cached<Intl.DateTimeFormat>(
      Intl.DateTimeFormat,
      "hijri|" + JSON.stringify(options ?? {}),
      loc,
      options ?? { day: "numeric", month: "long", year: "numeric" },
    ).format(d);
  } catch {
    return formatDate(d, locale, options);
  }
}

export function formatList(items: string[], locale: string, options?: Intl.ListFormatOptions) {
  return cached<Intl.ListFormat>(
    Intl.ListFormat,
    JSON.stringify(options ?? {}),
    locale,
    options,
  ).format(items);
}

const RTU: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

export function formatRelative(from: Date | number, locale: string, now: Date = new Date()) {
  const fromMs = from instanceof Date ? from.getTime() : from;
  const diffSec = Math.round((fromMs - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const [unit, secs] = RTU.find(([, s]) => abs >= s) ?? RTU[RTU.length - 1];
  return cached<Intl.RelativeTimeFormat>(
    Intl.RelativeTimeFormat,
    "auto",
    locale,
    { numeric: "auto" },
  ).format(Math.round(diffSec / secs), unit);
}

/** Best-effort IANA timezone; falls back to UTC. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Compute the local "streak day" boundary in the user's timezone rather than
 * UTC — prevents users in UTC+12/-12 losing streaks. Returns YYYY-MM-DD.
 */
export function localDayKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}
