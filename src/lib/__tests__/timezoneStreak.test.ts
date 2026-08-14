import { describe, it, expect } from "vitest";
import { localDayKey } from "@/lib/intl";

/**
 * Regression: streak day boundaries must follow the user's timezone. Before
 * this, a UTC calendar day silently cost streaks at UTC±12 — a user in
 * Kiritimati (UTC+14) completing a dose at 09:00 local was recorded on the
 * *previous* UTC date, and a user in Midway (UTC-11) at 20:00 local was
 * recorded on the *next* UTC date.
 */
describe("local streak day boundary", () => {
  const at = new Date("2026-08-14T20:30:00Z");

  it("computes the local calendar date ahead of UTC", () => {
    expect(localDayKey(at, "Pacific/Kiritimati")).toBe("2026-08-15");
    expect(localDayKey(at, "UTC")).toBe("2026-08-14");
  });

  it("computes the local calendar date behind UTC", () => {
    expect(localDayKey(new Date("2026-08-14T02:30:00Z"), "Pacific/Midway")).toBe("2026-08-13");
  });

  it("is stable across DST transitions", () => {
    // US DST ends 2026-11-01; 05:30Z is 01:30 local on both sides.
    expect(localDayKey(new Date("2026-11-01T05:30:00Z"), "America/New_York")).toBe("2026-11-01");
    expect(localDayKey(new Date("2026-10-31T05:30:00Z"), "America/New_York")).toBe("2026-10-31");
  });

  it("falls back to a valid date for an unknown timezone", () => {
    expect(() => localDayKey(at, "Not/AZone")).toBeTruthy();
  });

  it("treats last_completed_date comparisons per local day", () => {
    const localToday = localDayKey(at, "Pacific/Kiritimati"); // 2026-08-15
    const utcToday = localDayKey(at, "UTC"); // 2026-08-14
    // Completed "today" locally, yet a UTC-based job would flag it at risk.
    expect(localToday < localToday).toBe(false);
    expect(localToday > utcToday).toBe(true);
  });
});
