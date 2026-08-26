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
import { isRtlCaption } from "@/components/CaptionPicker";
import { languageLabel } from "@/components/LaneToggle";
import { useUploadPlayback } from "@/hooks/useCreatorStudio";
import { useUploadCaptions } from "@/hooks/useUploadCaptions";
import { analyseCaptionTracks } from "@/lib/captionQuality";

interface Props {
  uploadId: string;
  durationSeconds?: number | null;
  /** Focus a language on open (deep link from a quality notification). */
  initialLanguage?: string | null;
}

const CaptionReviewPanel = ({ uploadId, durationSeconds, initialLanguage }: Props) => {
  const playback = useUploadPlayback(uploadId);
  const captions = useUploadCaptions(uploadId);
  const tracks = captions.data ?? [];
  const [language, setLanguage] = useState<string | null>(initialLanguage ?? null);
  const [currentTime, setCurrentTime] = useState(0);
  const [editing, setEditing] = useState(false);
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

      <Button
        size="sm"
        variant="secondary"
        className="h-9"
        onClick={() => setEditing((v) => !v)}
        data-testid="caption-review-toggle-editor"
      >
        {editing ? "Close editor" : "Edit timings & text"}
      </Button>

      {editing && active && (
        <CaptionEditor uploadId={uploadId} track={active} durationSeconds={durationSeconds} />
      )}
    </div>
  );
};

export default CaptionReviewPanel;
