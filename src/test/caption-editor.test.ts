/**
 * Timecode parsing for the inline caption editor.
 *
 * Creators type timings by hand, so a bad string must be rejected (the field
 * reverts) rather than silently producing NaN timings that break the track.
 */
import { describe, it, expect } from "vitest";
import { clockToMs, msToClock } from "@/components/CaptionEditor";

describe("caption editor timecodes", () => {
  it("formats milliseconds as mm:ss.mmm", () => {
    expect(msToClock(0)).toBe("00:00.000");
    expect(msToClock(61_500)).toBe("01:01.500");
    expect(msToClock(-5)).toBe("00:00.000");
  });

  it("round-trips a formatted timecode", () => {
    for (const ms of [0, 999, 61_500, 3_599_000]) {
      expect(clockToMs(msToClock(ms))).toBe(ms);
    }
  });

  it("pads fractional seconds", () => {
    expect(clockToMs("00:01.5")).toBe(1500);
    expect(clockToMs("00:01,5")).toBe(1500);
  });

  it("rejects malformed or out-of-range input", () => {
    for (const bad of ["", "abc", "1:75.000", "12", "00:01.0000"]) {
      expect(clockToMs(bad)).toBeNull();
    }
  });
});
