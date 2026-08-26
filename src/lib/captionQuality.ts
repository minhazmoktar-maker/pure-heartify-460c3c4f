/**
 * Caption quality checks.
 *
 * Auto-generated captions (ASR) and machine translations both fail in
 * predictable ways: cues that overlap, blank cues, cues that drift away from
 * the audio, and long stretches with nothing at all. Creators should see those
 * problems in Studio *before* a video is published, so this module is a pure,
 * deterministic analyser over caption segments — no network, no side effects,
 * fully unit-testable.
 */
import type { CaptionSegment, CaptionTrack } from "@/hooks/useUploadCaptions";

export type CaptionIssueSeverity = "warning" | "info";

export interface CaptionIssue {
  code:
    | "overlap"
    | "empty_segment"
    | "out_of_order"
    | "zero_duration"
    | "too_fast"
    | "large_gap"
    | "coverage"
    | "sync_drift"
    | "no_segments";
  severity: CaptionIssueSeverity;
  message: string;
  count?: number;
}

export interface CaptionQualityReport {
  language: string;
  source: string;
  segments: number;
  /** 0-100; 100 means no detected problems. */
  score: number;
  issues: CaptionIssue[];
  coveragePct: number | null;
  /** Seconds between the media start and the first cue — a proxy for sync drift. */
  leadingSilence: number;
}

/**
 * The single source of truth for every caption threshold. Exported so the audit
 * trail can record the exact values that were in force when a check ran — a
 * score of 64 means nothing later on unless the bar it was measured against is
 * recorded alongside it.
 */
export const CAPTION_QUALITY_THRESHOLDS = {
  /** Silent gap (seconds) above which speech is assumed to be missing. */
  maxGapSeconds: 25,
  /** Cues shorter than this (ms) are unreadable. */
  minCueMs: 400,
  /** Above ~26 chars/second a cue is unreadable and usually mis-timed. */
  maxCps: 26,
  /** Leading silence (seconds) treated as sync drift. */
  driftSeconds: 12,
  /** Below this quality score, publishing should be reviewed first. */
  minPublishScore: 70,
  /** Minimum share of the video that captions must cover. */
  minCoveragePct: 35,
} as const;

const MAX_GAP_SECONDS = CAPTION_QUALITY_THRESHOLDS.maxGapSeconds;
const MIN_CUE_MS = CAPTION_QUALITY_THRESHOLDS.minCueMs;
const MAX_CPS = CAPTION_QUALITY_THRESHOLDS.maxCps;
const DRIFT_SECONDS = CAPTION_QUALITY_THRESHOLDS.driftSeconds;

function endOf(seg: CaptionSegment): number {
  return seg.end_ms ?? seg.start_ms + 3000;
}

export function analyseCaptionTrack(
  track: Pick<CaptionTrack, "language" | "source" | "segments">,
  durationSeconds?: number | null,
): CaptionQualityReport {
  const segments = [...(track.segments ?? [])];
  const issues: CaptionIssue[] = [];

  if (segments.length === 0) {
    return {
      language: track.language,
      source: track.source,
      segments: 0,
      score: 0,
      coveragePct: 0,
      leadingSilence: 0,
      issues: [
        {
          code: "no_segments",
          severity: "warning",
          message: "This track has no caption cues.",
        },
      ],
    };
  }

  let outOfOrder = 0;
  for (let i = 1; i < segments.length; i += 1) {
    if (segments[i].start_ms < segments[i - 1].start_ms) outOfOrder += 1;
  }
  const ordered = [...segments].sort((a, b) => a.start_ms - b.start_ms);

  let overlaps = 0;
  let gaps = 0;
  let spoken = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    const seg = ordered[i];
    spoken += Math.max(0, endOf(seg) - seg.start_ms);
    const next = ordered[i + 1];
    if (!next) continue;
    if (next.start_ms < endOf(seg) - 50) overlaps += 1;
    else if ((next.start_ms - endOf(seg)) / 1000 > MAX_GAP_SECONDS) gaps += 1;
  }

  const empty = ordered.filter((s) => !s.text || !s.text.trim()).length;
  const zeroDuration = ordered.filter((s) => endOf(s) - s.start_ms < MIN_CUE_MS).length;
  const tooFast = ordered.filter((s) => {
    const secs = (endOf(s) - s.start_ms) / 1000;
    return secs > 0 && (s.text?.trim().length ?? 0) / secs > MAX_CPS;
  }).length;

  const leadingSilence = ordered[0].start_ms / 1000;
  const lastEnd = endOf(ordered[ordered.length - 1]) / 1000;
  const coveragePct =
    durationSeconds && durationSeconds > 0
      ? Math.min(100, Math.round((spoken / 1000 / durationSeconds) * 100))
      : null;

  if (overlaps > 0) {
    issues.push({
      code: "overlap",
      severity: "warning",
      count: overlaps,
      message: `${overlaps} cue${overlaps > 1 ? "s" : ""} overlap the previous cue — subtitles will flicker.`,
    });
  }
  if (outOfOrder > 0) {
    issues.push({
      code: "out_of_order",
      severity: "warning",
      count: outOfOrder,
      message: `${outOfOrder} cue${outOfOrder > 1 ? "s are" : " is"} out of chronological order.`,
    });
  }
  if (empty > 0) {
    issues.push({
      code: "empty_segment",
      severity: "warning",
      count: empty,
      message: `${empty} empty cue${empty > 1 ? "s" : ""} — missing transcribed speech.`,
    });
  }
  if (zeroDuration > 0) {
    issues.push({
      code: "zero_duration",
      severity: "info",
      count: zeroDuration,
      message: `${zeroDuration} cue${zeroDuration > 1 ? "s are" : " is"} shorter than 0.4s and may not be readable.`,
    });
  }
  if (tooFast > 0) {
    issues.push({
      code: "too_fast",
      severity: "info",
      count: tooFast,
      message: `${tooFast} cue${tooFast > 1 ? "s" : ""} exceed ${MAX_CPS} characters per second.`,
    });
  }
  if (gaps > 0) {
    issues.push({
      code: "large_gap",
      severity: "warning",
      count: gaps,
      message: `${gaps} silent gap${gaps > 1 ? "s" : ""} longer than ${MAX_GAP_SECONDS}s — speech may be missing.`,
    });
  }
  if (leadingSilence > DRIFT_SECONDS) {
    issues.push({
      code: "sync_drift",
      severity: "warning",
      message: `First cue starts ${Math.round(leadingSilence)}s in — captions may be out of sync.`,
    });
  }
  if (durationSeconds && durationSeconds > 0) {
    if (lastEnd < durationSeconds * 0.6) {
      issues.push({
        code: "sync_drift",
        severity: "warning",
        message: `Captions stop at ${Math.round(lastEnd)}s of ${Math.round(durationSeconds)}s — the tail is untranscribed.`,
      });
    }
    if ((coveragePct ?? 100) < CAPTION_QUALITY_THRESHOLDS.minCoveragePct) {
      issues.push({
        code: "coverage",
        severity: "info",
        message: `Only ${coveragePct}% of the video is covered by captions.`,
      });
    }
  }

  const penalty = issues.reduce((sum, i) => sum + (i.severity === "warning" ? 18 : 7), 0);
  return {
    language: track.language,
    source: track.source,
    segments: segments.length,
    score: Math.max(0, 100 - penalty),
    issues,
    coveragePct,
    leadingSilence,
  };
}

export function analyseCaptionTracks(
  tracks: Array<Pick<CaptionTrack, "language" | "source" | "segments">> | undefined,
  durationSeconds?: number | null,
): CaptionQualityReport[] {
  return (tracks ?? []).map((t) => analyseCaptionTrack(t, durationSeconds));
}

export function worstCaptionScore(reports: CaptionQualityReport[]): number | null {
  if (reports.length === 0) return null;
  return reports.reduce((min, r) => Math.min(min, r.score), 100);
}

/**
 * Whether a track should be reviewed before publishing. Used by Creator Studio
 * to surface a warning, and by the audit trail to record why.
 */
export function captionBlocksPublish(report: CaptionQualityReport): boolean {
  return (
    report.score < CAPTION_QUALITY_THRESHOLDS.minPublishScore ||
    report.issues.some((i) => i.severity === "warning")
  );
}
