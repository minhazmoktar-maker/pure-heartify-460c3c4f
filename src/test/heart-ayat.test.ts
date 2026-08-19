import { describe, it, expect } from "vitest";
import { HEART_AYAT, heartAyahForDay, ayahDayIndex } from "@/data/heartAyat";

const AYAH_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

describe("Heart Ayat rotation", () => {
  it("has more than 365 curated verses", () => {
    expect(HEART_AYAT.length).toBeGreaterThan(365);
  });

  it("contains no duplicate references and only valid surah:ayah pairs", () => {
    const keys = new Set<string>();
    for (const v of HEART_AYAT) {
      const key = `${v.s}:${v.a}`;
      expect(keys.has(key), `duplicate ${key}`).toBe(false);
      keys.add(key);
      expect(v.s).toBeGreaterThanOrEqual(1);
      expect(v.s).toBeLessThanOrEqual(114);
      expect(v.a).toBeGreaterThanOrEqual(1);
      expect(v.a).toBeLessThanOrEqual(AYAH_COUNTS[v.s - 1]);
      expect(v.ar.trim().length).toBeGreaterThan(3);
      expect(v.en.trim().length).toBeGreaterThan(3);
      expect(v.ref).toContain(`${v.s}:${v.a}`);
    }
  });

  it("serves a different ayah on each of 365 consecutive days", () => {
    const seen = new Set<string>();
    const start = new Date(Date.UTC(2026, 7, 19));
    for (let i = 0; i < 365; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const v = heartAyahForDay(d);
      const key = `${v.s}:${v.a}`;
      expect(seen.has(key), `repeat on day ${i}: ${key}`).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(365);
  });

  it("is stable within the same UTC day", () => {
    const a = heartAyahForDay(new Date(Date.UTC(2026, 7, 19, 1)));
    const b = heartAyahForDay(new Date(Date.UTC(2026, 7, 19, 23)));
    expect(a.ref).toBe(b.ref);
    expect(ayahDayIndex(new Date(Date.UTC(2026, 7, 19, 1)))).toBe(ayahDayIndex(new Date(Date.UTC(2026, 7, 19, 23))));
  });
});
