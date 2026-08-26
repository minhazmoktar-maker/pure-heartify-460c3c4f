import { describe, expect, it } from "vitest";
import { analyseCaptionTrack } from "@/lib/captionQuality";
import { resolveCaptionTrack } from "@/lib/captionFallback";

const seg = (start: number, end: number, text = "hello world") => ({
  start_ms: start,
  end_ms: end,
  text,
});

describe("analyseCaptionTrack", () => {
  it("reports a clean track with no issues", () => {
    const report = analyseCaptionTrack(
      { language: "bn", source: "asr", segments: [seg(0, 2000), seg(2100, 4000), seg(4100, 6000)] },
      6,
    );
    expect(report.issues).toHaveLength(0);
    expect(report.score).toBe(100);
  });

  it("detects overlapping cues", () => {
    const report = analyseCaptionTrack({
      language: "en",
      source: "asr",
      segments: [seg(0, 3000), seg(1000, 4000)],
    });
    expect(report.issues.map((i) => i.code)).toContain("overlap");
    expect(report.score).toBeLessThan(100);
  });

  it("detects empty cues and large gaps", () => {
    const report = analyseCaptionTrack({
      language: "en",
      source: "asr",
      segments: [seg(0, 2000, "  "), seg(60_000, 62_000)],
    });
    const codes = report.issues.map((i) => i.code);
    expect(codes).toContain("empty_segment");
    expect(codes).toContain("large_gap");
  });

  it("detects sync drift when the first cue starts late", () => {
    const report = analyseCaptionTrack(
      { language: "ar", source: "asr", segments: [seg(30_000, 32_000)] },
      40,
    );
    expect(report.issues.some((i) => i.code === "sync_drift")).toBe(true);
  });

  it("flags an empty track", () => {
    const report = analyseCaptionTrack({ language: "en", source: "asr", segments: [] });
    expect(report.issues[0].code).toBe("no_segments");
    expect(report.score).toBe(0);
  });
});

describe("resolveCaptionTrack", () => {
  const tracks = [
    { language: "en", source: "asr" },
    { language: "ar", source: "mt" },
  ];

  it("prefers the native lane track", () => {
    expect(resolveCaptionTrack(tracks, { nativeLanguage: "ar" })).toEqual({
      track: tracks[1],
      reason: "native_translated",
    });
  });

  it("honours an explicit picker choice", () => {
    expect(resolveCaptionTrack(tracks, { nativeLanguage: "ar", preferred: "en" }).track).toEqual(
      tracks[0],
    );
  });

  it("falls back to the UI language, then the original language", () => {
    expect(resolveCaptionTrack(tracks, { nativeLanguage: "bn", uiLanguage: "en" }).reason).toBe(
      "ui_language",
    );
    expect(
      resolveCaptionTrack(tracks, { nativeLanguage: "bn", uiLanguage: "ur", contentLanguage: "en" })
        .reason,
    ).toBe("content_language");
  });

  it("falls back to any translated track before giving up", () => {
    expect(
      resolveCaptionTrack([{ language: "tr", source: "mt" }], { nativeLanguage: "bn" }).reason,
    ).toBe("any_translated");
  });

  it("reports none when there are no tracks", () => {
    expect(resolveCaptionTrack([], { nativeLanguage: "bn" })).toEqual({
      track: null,
      reason: "none",
    });
  });
});
