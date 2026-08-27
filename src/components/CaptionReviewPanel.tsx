/**
 * Caption review step — used before publishing (Creator Studio) and before
 * approving (admin review).
 *
 * Shows the real video with the styled caption overlay so sync, overlaps and
 * RTL rendering are checked by watching, not by trusting a score; lists the
 * quality report per track; and opens the inline editor for fixes. Nothing here
 * publishes anything — it is the last look before the decision.
 */
import { useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CaptionOverlay from "@/components/CaptionOverlay";
import CaptionEditor from "@/components/CaptionEditor";
import CaptionSettingsSheet from "@/components/CaptionSettingsSheet";
import CaptionAuditTrail from "@/components/CaptionAuditTrail";
import { isRtlCaption } from "@/components/CaptionPicker";
import { languageLabel } from "@/components/LaneToggle";
import { useUploadPlayback } from "@/hooks/useCreatorStudio";
import { useUploadCaptions } from "@/hooks/useUploadCaptions";
import { analyseCaptionTracks } from "@/lib/captionQuality";
import { logCaptionAudit } from "@/lib/captionAudit";
import { useCaptionPanelState } from "@/hooks/useCaptionPanelState";

interface Props {
  uploadId: string;
  durationSeconds?: number | null;
  /** Focus a language on open (deep link from a quality notification). */
  initialLanguage?: string | null;
}

const CaptionReviewPanel = ({ uploadId, durationSeconds, initialLanguage }: Props) => {
  const playback = useUploadPlayback(uploadId, "review_panel");
  const captions = useUploadCaptions(uploadId);
  const tracks = captions.data ?? [];
  // Per-upload UI state (track, editor open, RTL mirroring, text scale, high
  // contrast) is remembered across close/reopen and across switching uploads.
  const { panelState, updatePanelState } = useCaptionPanelState(uploadId);
  const language = initialLanguage ?? panelState.language;
  const setLanguage = (next: string) => updatePanelState({ language: next });
  const editing = panelState.editing;
  const setEditing = (next: boolean) => updatePanelState({ editing: next });
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const active = useMemo(
    () => tracks.find((t) => t.language === language) ?? tracks[0] ?? null,
    [tracks, language],
  );
  const reports = useMemo(
    () => analyseCaptionTracks(tracks, durationSeconds),
    [tracks, durationSeconds],
  );
  const activeReport = reports.find((r) => r.language === active?.language) ?? null;

  // Audit entries are only written for explicit reviewer actions — mounting the
  // panel is not a review, so nothing is logged until the button is pressed.
  const [reviewLogged, setReviewLogged] = useState<string | null>(null);
  const confirmReview = async () => {
    if (!activeReport) return;
    await logCaptionAudit({
      uploadId,
      language: activeReport.language,
      action: "publish_review",
      report: activeReport,
    });
    setReviewLogged(activeReport.language);
  };


  if (captions.isLoading) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="caption-review-loading">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading captions for review…
      </p>
    );
  }

  if (tracks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="caption-review-empty">
        No caption tracks to review yet — they are generated automatically and appear here when ready.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="caption-review-panel">
      <div className="relative overflow-hidden rounded-lg bg-black">
        {playback.url ? (
          <video
            ref={videoRef}
            src={playback.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onSeeked={(e) => setCurrentTime(e.currentTarget.currentTime)}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-xs text-muted-foreground">
            {playback.loading ? "Loading preview…" : playback.error ?? "No preview available"}
          </div>
        )}
        <CaptionOverlay
          segments={active?.segments}
          language={active?.language}
          currentTime={currentTime}
          testId="caption-review-overlay"
          overrides={{
            mirrorRtl: panelState.mirrorRtl,
            highContrast: panelState.highContrast,
            fontScale: panelState.textScale,
            sizePreset: "custom",
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tracks.map((track) => (
          <button
            key={track.language}
            type="button"
            dir={isRtlCaption(track.language) ? "rtl" : "ltr"}
            onClick={() => setLanguage(track.language)}
            data-testid={`caption-review-track-${track.language}`}
            aria-pressed={active?.language === track.language}
            className={`min-h-[32px] rounded-pill border px-3 text-[11px] transition-colors ${
              active?.language === track.language
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:bg-accent/50"
            }`}
          >
            {languageLabel(track.language)}
          </button>
        ))}
        <CaptionSettingsSheet previewRtl={isRtlCaption(active?.language)} testId="caption-review-settings" />
        <button
          type="button"
          onClick={() => updatePanelState({ mirrorRtl: !panelState.mirrorRtl })}
          aria-pressed={panelState.mirrorRtl}
          data-testid="caption-review-mirror-rtl"
          className="min-h-[32px] rounded-pill border border-border px-3 text-[11px] text-muted-foreground hover:bg-accent/50"
        >
          RTL mirroring {panelState.mirrorRtl ? "on" : "off"}
        </button>
        <button
          type="button"
          onClick={() => updatePanelState({ highContrast: !panelState.highContrast })}
          aria-pressed={panelState.highContrast}
          data-testid="caption-review-high-contrast"
          className="min-h-[32px] rounded-pill border border-border px-3 text-[11px] text-muted-foreground hover:bg-accent/50"
        >
          High contrast {panelState.highContrast ? "on" : "off"}
        </button>
        <button
          type="button"
          onClick={() =>
            updatePanelState({ textScale: panelState.textScale >= 1.6 ? 1 : panelState.textScale + 0.2 })
          }
          data-testid="caption-review-text-scale"
          className="min-h-[32px] rounded-pill border border-border px-3 text-[11px] text-muted-foreground hover:bg-accent/50"
        >
          Text {panelState.textScale.toFixed(1)}x
        </button>
      </div>

      {activeReport && (
        <div className="rounded-lg border border-border bg-muted/30 p-2 text-[11px]" data-testid="caption-review-report">
          <p className="font-medium text-foreground">
            {languageLabel(activeReport.language)} · quality {activeReport.score}/100 ·{" "}
            {activeReport.segments} cues
            {activeReport.coveragePct !== null ? ` · ${activeReport.coveragePct}% covered` : ""}
          </p>
          {activeReport.issues.length === 0 ? (
            <p className="text-muted-foreground">
              No overlaps, missing cues or sync drift detected — safe to publish.
            </p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {activeReport.issues.map((issue, i) => (
                <li key={`${issue.code}-${i}`}>· {issue.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-9"
          onClick={() => setEditing(!editing)}
          data-testid="caption-review-toggle-editor"
        >
          {editing ? "Close editor" : "Edit timings & text"}
        </Button>
        <Button
          size="sm"
          className="h-9"
          disabled={!activeReport || reviewLogged === activeReport.language}
          onClick={() => void confirmReview()}
          data-testid="caption-review-confirm"
        >
          {activeReport && reviewLogged === activeReport.language
            ? "Review recorded"
            : "Mark captions reviewed"}
        </Button>
      </div>


      {editing && active && (
        <CaptionEditor
          uploadId={uploadId}
          track={active}
          durationSeconds={durationSeconds}
          onSaved={() => void captions.refetch()}
        />
      )}

      <CaptionAuditTrail uploadId={uploadId} language={active?.language} />
    </div>
  );
};

export default CaptionReviewPanel;
