/**
 * Inline caption editor.
 *
 * Auto-generated captions are good, not perfect: a cue lands a second early, a
 * name is mis-transcribed, an Arabic line needs its wording fixed. Creators
 * edit timings and text here, re-run the quality checks on the edited draft,
 * and only then publish — so nothing ships with known bad captions.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { languageLabel } from "@/components/LaneToggle";
import { isRtlCaption } from "@/components/CaptionPicker";
import { analyseCaptionTrack, type CaptionQualityReport } from "@/lib/captionQuality";
import { useSaveCaptionTrack, type CaptionSegment, type CaptionTrack } from "@/hooks/useUploadCaptions";
import { toast } from "@/hooks/use-toast";

interface Props {
  uploadId: string;
  track: CaptionTrack;
  durationSeconds?: number | null;
  onSaved?: () => void;
}

/** mm:ss.mmm ↔ milliseconds, so timings can be typed by hand. */
export function msToClock(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(total % 1000).padStart(3, "0")}`;
}

export function clockToMs(value: string): number | null {
  const match = /^(\d{1,3}):(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(value.trim());
  if (!match) return null;
  const [, m, s, frac] = match;
  const seconds = Number(s);
  if (seconds > 59) return null;
  return Number(m) * 60000 + seconds * 1000 + Number((frac ?? "0").padEnd(3, "0"));
}

const CaptionEditor = ({ uploadId, track, durationSeconds, onSaved }: Props) => {
  const [draft, setDraft] = useState<CaptionSegment[]>(track.segments ?? []);
  const [report, setReport] = useState<CaptionQualityReport | null>(null);
  const save = useSaveCaptionTrack(uploadId);
  const rtl = isRtlCaption(track.language);

  useEffect(() => {
    setDraft(track.segments ?? []);
    setReport(null);
  }, [track.language, track.segments]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(track.segments ?? []),
    [draft, track.segments],
  );

  const patch = (index: number, next: Partial<CaptionSegment>) =>
    setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, ...next } : row)));

  const runChecks = () => {
    setReport(analyseCaptionTrack({ ...track, segments: draft }, durationSeconds));
  };

  return (
    <div className="space-y-3" data-testid="caption-editor">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground" dir={rtl ? "rtl" : "ltr"}>
          {languageLabel(track.language)}
          {track.source === "mt" ? " · translated" : " · auto-generated"}
        </span>
        <span className="text-[11px] text-muted-foreground">{draft.length} cues</span>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-9"
            onClick={runChecks}
            data-testid="caption-editor-recheck"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-run quality checks
          </Button>
          <Button
            size="sm"
            className="h-9"
            disabled={!dirty || save.isPending}
            data-testid="caption-editor-save"
            onClick={() =>
              save.mutate(
                { language: track.language, segments: draft },
                {
                  onSuccess: () => {
                    toast({ title: "Captions saved", description: `${languageLabel(track.language)} track updated.` });
                    runChecks();
                    onSaved?.();
                  },
                  onError: (err) =>
                    toast({
                      title: "Could not save captions",
                      description: (err as Error).message,
                      variant: "destructive",
                    }),
                },
              )
            }
          >
            {save.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {report && (
        <div
          className="rounded-lg border border-border bg-muted/30 p-2 text-[11px]"
          data-testid="caption-editor-report"
        >
          <p className="font-medium text-foreground">Quality {report.score}/100 · {report.issues.length} issue(s)</p>
          {report.issues.length === 0 ? (
            <p className="text-muted-foreground">No timing overlaps, missing cues or sync drift.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {report.issues.map((issue, i) => (
                <li key={`${issue.code}-${i}`}>· {issue.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {draft.map((segment, index) => (
          <li key={index} className="rounded-lg border border-border/60 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`Cue ${index + 1} start`}
                defaultValue={msToClock(segment.start_ms)}
                onBlur={(e) => {
                  const ms = clockToMs(e.target.value);
                  if (ms === null) {
                    e.target.value = msToClock(segment.start_ms);
                    return;
                  }
                  patch(index, { start_ms: ms });
                }}
                className="h-9 w-28 font-mono text-[11px]"
                data-testid={`caption-editor-start-${index}`}
              />
              <span className="text-[11px] text-muted-foreground">→</span>
              <Input
                aria-label={`Cue ${index + 1} end`}
                defaultValue={msToClock(segment.end_ms ?? segment.start_ms + 3000)}
                onBlur={(e) => {
                  const ms = clockToMs(e.target.value);
                  if (ms === null) {
                    e.target.value = msToClock(segment.end_ms ?? segment.start_ms + 3000);
                    return;
                  }
                  patch(index, { end_ms: ms });
                }}
                className="h-9 w-28 font-mono text-[11px]"
                data-testid={`caption-editor-end-${index}`}
              />
            </div>
            <Textarea
              aria-label={`Cue ${index + 1} text`}
              value={segment.text}
              dir={rtl ? "rtl" : "ltr"}
              lang={track.language}
              rows={2}
              onChange={(e) => patch(index, { text: e.target.value })}
              className={`mt-2 text-xs ${rtl ? "text-right" : ""}`}
              data-testid={`caption-editor-text-${index}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CaptionEditor;
