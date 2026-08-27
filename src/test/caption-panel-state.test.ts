/**
 * Per-upload caption review panel state must survive closing a panel,
 * switching to another upload, and coming back.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_CAPTION_PANEL_STATE,
  clearCaptionPanelState,
  loadCaptionPanelState,
  normalizeCaptionPanelState,
  saveCaptionPanelState,
} from "@/lib/captionPanelState";

describe("captionPanelState", () => {
  beforeEach(() => clearCaptionPanelState());

  it("defaults to sane values for an unknown upload", () => {
    expect(loadCaptionPanelState("nope")).toEqual(DEFAULT_CAPTION_PANEL_STATE);
  });

  it("persists RTL mirroring, text scale and high contrast per upload", () => {
    saveCaptionPanelState("a", { mirrorRtl: false, textScale: 1.6, highContrast: true, language: "ar" });
    saveCaptionPanelState("b", { textScale: 1.2, language: "bn" });

    expect(loadCaptionPanelState("a")).toMatchObject({
      mirrorRtl: false,
      textScale: 1.6,
      highContrast: true,
      language: "ar",
    });
    // Switching uploads must not leak the other upload's setup.
    expect(loadCaptionPanelState("b")).toMatchObject({
      mirrorRtl: true,
      textScale: 1.2,
      highContrast: false,
      language: "bn",
    });
    // …and returning restores the first upload unchanged.
    expect(loadCaptionPanelState("a").textScale).toBe(1.6);
  });

  it("remembers the editor open state and merges partial patches", () => {
    saveCaptionPanelState("a", { editing: true, language: "ur" });
    saveCaptionPanelState("a", { textScale: 1.4 });
    expect(loadCaptionPanelState("a")).toMatchObject({ editing: true, language: "ur", textScale: 1.4 });
  });

  it("clamps and sanitises hostile stored values", () => {
    expect(normalizeCaptionPanelState({ textScale: 99 }).textScale).toBe(2.4);
    expect(normalizeCaptionPanelState({ textScale: -5 }).textScale).toBe(0.8);
    expect(normalizeCaptionPanelState({ language: 12 }).language).toBeNull();
    expect(normalizeCaptionPanelState(null)).toEqual(DEFAULT_CAPTION_PANEL_STATE);
  });
});
