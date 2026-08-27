/**
 * Styled caption overlay.
 *
 * Native `::cue` styling is inconsistent across browsers and WebViews and has
 * no RTL alignment control, so the active cue is rendered from the caption
 * segments the app already holds. That makes the viewer's font size, backing
 * plate, line height and RTL mirroring behave identically on iOS Safari,
 * Android Chrome and desktop.
 */
import { useMemo } from "react";
import type { CaptionSegment } from "@/hooks/useUploadCaptions";
import {
  type CaptionSettings,
  captionLineStyle,
  useCaptionSettings,
} from "@/hooks/useCaptionSettings";
import { isRtlCaption } from "@/components/CaptionPicker";

interface Props {
  segments: CaptionSegment[] | undefined;
  language: string | null | undefined;
  /** Player position in seconds. */
  currentTime: number;
  testId?: string;
  /**
   * Per-surface overrides applied on top of the viewer's saved settings —
   * used by the Creator Studio review panel, which remembers RTL mirroring,
   * text scale and high contrast per upload.
   */
  overrides?: Partial<CaptionSettings>;
}

export function activeCue(
  segments: CaptionSegment[] | undefined,
  currentTimeMs: number,
): CaptionSegment | null {
  if (!segments?.length) return null;
  // Segments are near-sorted; a linear scan over a few thousand cues is
  // cheaper than rebuilding an index on every timeupdate tick.
  let best: CaptionSegment | null = null;
  for (const seg of segments) {
    const end = seg.end_ms ?? seg.start_ms + 3000;
    if (seg.start_ms <= currentTimeMs && currentTimeMs < end) {
      if (!best || seg.start_ms > best.start_ms) best = seg;
    }
  }
  return best && best.text?.trim() ? best : null;
}

const CaptionOverlay = ({ segments, language, currentTime, testId = "caption-overlay" }: Props) => {
  const { settings } = useCaptionSettings();
  const rtl = isRtlCaption(language);
  const cue = useMemo(() => activeCue(segments, Math.round(currentTime * 1000)), [segments, currentTime]);

  if (!settings.enabled || !cue) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center px-4"
      aria-live="off"
      data-testid={testId}
    >
      <p
        lang={language ?? undefined}
        dir={rtl && settings.mirrorRtl ? "rtl" : "ltr"}
        className="max-w-[92%] rounded-md px-3 py-1.5 text-base text-white sm:text-lg"
        style={captionLineStyle(settings, rtl)}
      >
        {cue.text}
      </p>
    </div>
  );
};

export default CaptionOverlay;
