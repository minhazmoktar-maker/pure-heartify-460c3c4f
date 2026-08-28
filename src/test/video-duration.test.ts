/**
 * Real durations replace the assumed 6-min-per-video guess.
 *
 * Covers the two halves of the contract:
 *   1. YouTube ISO-8601 parsing (the sweep writes what this returns).
 *   2. Display + dose-length maths degrade to a fallback while a video is
 *      still unverified, and never render a fake "0:00".
 */
import { describe, expect, it } from "vitest";
import { formatDuration, totalMinutes } from "@/lib/formatDuration";
import { parseIsoDuration } from "../../supabase/functions/sweep-embeddable/sweep";

describe("parseIsoDuration", () => {
  it("parses hours, minutes and seconds", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT12M")).toBe(720);
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("P1DT2H")).toBe(93600);
  });

  it("returns null for live streams and unparsable values", () => {
    // Live/upcoming videos report P0D or omit contentDetails.duration entirely.
    expect(parseIsoDuration("P0D")).toBeNull();
    expect(parseIsoDuration("PT0S")).toBeNull();
    expect(parseIsoDuration(undefined)).toBeNull();
    expect(parseIsoDuration("garbage")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("hides itself while unverified rather than showing 0:00", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(0)).toBeNull();
  });
});

describe("dose length", () => {
  it("uses verified durations when present", () => {
    // 5:00 + 7:30 + 3:00 = 15.5 min → 16
    expect(totalMinutes([300, 450, 180])).toBe(16);
  });

  it("falls back per unverified video only", () => {
    // 10 min verified + two unverified at 6 min = 22
    expect(totalMinutes([600, null, undefined])).toBe(22);
  });

  it("never reports a zero-minute dose", () => {
    expect(totalMinutes([])).toBe(1);
  });
});
