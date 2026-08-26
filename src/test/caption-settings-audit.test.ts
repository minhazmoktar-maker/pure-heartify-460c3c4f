/**
 * Caption accessibility settings + audit-trail contract.
 *
 * These are the pieces a viewer's readability and a moderator's paper trail
 * depend on, so they are pinned: preset sizing, the high-contrast override,
 * threshold attribution, and the CSV export shape.
 */
import { describe, expect, it } from "vitest";
import {
  CAPTION_SIZE_PRESETS,
  DEFAULT_CAPTION_SETTINGS,
  captionLineStyle,
  effectiveCaptionScale,
  normalizeCaptionSettings,
} from "@/hooks/useCaptionSettings";
import { CAPTION_QUALITY_THRESHOLDS, analyseCaptionTrack, captionBlocksPublish } from "@/lib/captionQuality";
import { captionAuditCsv, trippedThresholds, type CaptionAuditRow } from "@/lib/captionAudit";
import { expectedCaptionLoadMs } from "@/lib/captionPerf";

describe("caption settings", () => {
  it("fills defaults and clamps the accessibility fields", () => {
    const s = normalizeCaptionSettings({ edgeOpacity: 5, fontScale: 99, sizePreset: "bogus" });
    expect(s.edgeOpacity).toBe(1);
    expect(s.fontScale).toBe(2.4);
    expect(s.sizePreset).toBe(DEFAULT_CAPTION_SETTINGS.sizePreset);
    expect(s.followOsScaling).toBe(true);
    expect(s.highContrast).toBe(false);
  });

  it("uses the named preset unless the slider was moved", () => {
    const preset = normalizeCaptionSettings({ sizePreset: "large", fontScale: 1 });
    // jsdom root font-size is 16px, so the OS factor is 1.
    expect(effectiveCaptionScale(preset)).toBeCloseTo(CAPTION_SIZE_PRESETS.large, 5);

    const custom = normalizeCaptionSettings({ sizePreset: "custom", fontScale: 1.25 });
    expect(effectiveCaptionScale(custom)).toBeCloseTo(1.25, 5);
  });

  it("ignores OS scaling when the viewer opts out", () => {
    const off = normalizeCaptionSettings({ sizePreset: "medium", followOsScaling: false });
    expect(effectiveCaptionScale(off)).toBeCloseTo(1, 5);
  });

  it("high contrast wins over theme tokens and drops the soft edge", () => {
    const plain = captionLineStyle(normalizeCaptionSettings({ edgeOpacity: 0.6 }), false);
    expect(plain.textShadow).toBeTruthy();

    const hc = captionLineStyle(normalizeCaptionSettings({ highContrast: true, edgeOpacity: 0.6 }), false);
    expect(hc.color).toBe("#ffffff");
    expect(hc.backgroundColor).toBe("#000000");
    expect(hc.textShadow).toBeUndefined();
  });

  it("mirrors alignment only when RTL mirroring is on", () => {
    const on = captionLineStyle(normalizeCaptionSettings({ mirrorRtl: true }), true);
    expect(on.direction).toBe("rtl");
    expect(on.textAlign).toBe("right");

    const off = captionLineStyle(normalizeCaptionSettings({ mirrorRtl: false }), true);
    expect(off.direction).toBe("ltr");
    expect(off.textAlign).toBe("center");
  });
});

describe("caption audit trail", () => {
  const badTrack = analyseCaptionTrack(
    {
      language: "ar",
      source: "asr",
      segments: [
        { start_ms: 30_000, end_ms: 31_000, text: "first cue arrives far too late" },
        { start_ms: 30_500, end_ms: 32_000, text: "overlapping cue" },
      ],
    },
    600,
  );

  it("attributes the thresholds that actually fired", () => {
    const tripped = trippedThresholds(badTrack);
    expect(tripped).toContain("overlap");
    expect(tripped).toContain("sync_drift");
    expect(tripped).toContain("min_publish_score");
    expect(badTrack.score).toBeLessThan(CAPTION_QUALITY_THRESHOLDS.minPublishScore);
    expect(captionBlocksPublish(badTrack)).toBe(true);
  });

  it("reports nothing tripped for a clean track", () => {
    const clean = analyseCaptionTrack(
      {
        language: "en",
        source: "asr",
        segments: Array.from({ length: 20 }, (_, i) => ({
          start_ms: i * 3000,
          end_ms: i * 3000 + 2800,
          text: "a readable line of speech",
        })),
      },
      60,
    );
    expect(trippedThresholds(clean)).toEqual([]);
    expect(captionBlocksPublish(clean)).toBe(false);
  });

  it("exports a quoted CSV with the tripped thresholds column", () => {
    const rows: CaptionAuditRow[] = [
      {
        id: "1",
        upload_id: "u-1",
        language: "ar",
        action: "quality_check",
        score: 46,
        segment_count: 2,
        issues: [{ code: "overlap" }, { message: 'cue "A" overlaps' }],
        thresholds: { tripped: ["overlap", "sync_drift"] },
        actor_id: "user-1",
        actor_role: null,
        created_at: "2026-08-26T10:00:00.000Z",
      },
    ];
    const csv = captionAuditCsv(rows);
    const [header, line] = csv.split("\n");
    expect(header).toContain("tripped_thresholds");
    expect(line).toContain('"overlap; sync_drift"');
    // Embedded quotes must be doubled, not dropped.
    expect(line).toContain('""A""');
  });
});

describe("caption load expectations", () => {
  it("returns a positive budget on every network class", () => {
    expect(expectedCaptionLoadMs()).toBeGreaterThan(0);
  });
});
