import { describe, it, expect } from "vitest";
import { notificationTarget, notificationCta } from "@/lib/notificationRoutes";
import { preferLatinSegment, isLatinText } from "@/lib/displayText";

describe("notification deep links", () => {
  it("sends a connection request to the requests tab", () => {
    expect(notificationTarget("connection_request", null)).toBe("/connections?tab=requests");
    expect(notificationCta("connection_request", null)).toBe("Review request");
  });

  it("respects an explicit cta url", () => {
    expect(notificationTarget("badge_earned", { cta_url: "/achievements?new=1" })).toBe(
      "/achievements?new=1",
    );
  });

  it("never returns an empty target", () => {
    for (const kind of ["unknown_kind", "streak_risk", "khatm_invite", "weekly_recap"]) {
      expect(notificationTarget(kind, {})).toMatch(/^\//);
    }
  });

  it("links report resolutions to the video when present", () => {
    expect(notificationTarget("report_resolved", { video_id: "abc" })).toBe("/watch/abc");
  });
});

describe("bilingual feed text", () => {
  it("folds to the English side for an English UI", () => {
    expect(preferLatinSegment("সূরা আল-বাকারা | Surah Al-Baqara", "en")).toBe("Surah Al-Baqara");
  });

  it("keeps local script when the UI is not English", () => {
    expect(preferLatinSegment("সূরা আল-বাকারা | Surah Al-Baqara", "bn")).toContain("সূরা");
  });

  it("leaves single-language titles untouched", () => {
    expect(preferLatinSegment("তাফসীর ক্লাস", "en")).toBe("তাফসীর ক্লাস");
    expect(preferLatinSegment("Tafsir class", "en")).toBe("Tafsir class");
  });

  it("detects script", () => {
    expect(isLatinText("Surah Al-Baqara")).toBe(true);
    expect(isLatinText("সূরা")).toBe(false);
  });
});
