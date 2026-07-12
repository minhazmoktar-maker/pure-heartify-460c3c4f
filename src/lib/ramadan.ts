/**
 * Ramadan Mode utilities.
 * Uses the built-in Intl Islamic-Umm-al-Qura calendar to detect whether "today"
 * (in the viewer's local timezone) falls in Ramaḍān (month 9). No network,
 * no dependencies — safe to call on every render.
 */

export type HijriInfo = {
  day: number;
  month: number; // 1..12
  year: number;
  isRamadan: boolean;
  isLastTen: boolean; // The odd nights of Laylat al-Qadr live in the last 10.
};

export function getHijriInfo(date: Date = new Date()): HijriInfo {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const day = get("day");
    const month = get("month");
    const year = get("year");
    return {
      day,
      month,
      year,
      isRamadan: month === 9,
      isLastTen: month === 9 && day >= 21,
    };
  } catch {
    return { day: 0, month: 0, year: 0, isRamadan: false, isLastTen: false };
  }
}

export function useRamadanMode() {
  return getHijriInfo();
}
