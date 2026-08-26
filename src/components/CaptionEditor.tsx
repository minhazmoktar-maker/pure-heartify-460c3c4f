/**
 * Inline caption editor.
 *
 * Auto-generated captions are good, not perfect: a cue lands a second early, a
 * name is mis-transcribed, an Arabic line needs its wording fixed. Creators
 * edit timings and text here, re-run the quality checks on the edited draft,
 * and only then publish — so nothing ships with known bad captions.
 *
 * Editing safety net:
 *  - **Autosave** commits a clean draft a few seconds after typing stops, so a
 *    closed tab never loses an hour of caption work.
 *  - **Version history** lists the server-side snapshot taken before each
 *    change; any entry can be previewed and restored before publishing.
 *  - **Conflict handling** is optimistic-concurrency based: the save carries the
 *    `updated_at` the draft started from. If a moderator saved first, the write
 *    is refused, autosave stops, and the editor offers to load their version
 *    instead of silently overwriting it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, History, Loader2, RefreshCw, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { languageLabel } from "@/components/LaneToggle";
import { isRtlCaption } from "@/components/CaptionPicker";
import {
  analyseCaptionTrack,
  captionBlocksPublish,
  type CaptionQualityReport,
} from "@/lib/captionQuality";
import { logCaptionAudit } from "@/lib/captionAudit";
import {
  CAPTION_CONFLICT,
  normalizeSegments,
  useCaptionVersions,
  useRestoreCaptionVersion,
  useSaveCaptionTrack,
  type CaptionSegment,
  type CaptionTrack,
} from "@/hooks/useUploadCaptions";
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

const AUTOSAVE_DELAY_MS = 2500;

const CaptionEditor = ({ uploadId, track, durationSeconds, onSaved }: Props) => {
  const [draft, setDraft] = useState<CaptionSegment[]>(track.segments ?? []);
  const [report, setReport] = useState<CaptionQualityReport | null>(null);
  const [autosave, setAutosave] = useState(true);
  const [conflict, setConflict] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(track.updated_at ?? null);

  const save = useSaveCaptionTrack(uploadId);
  const restore = useRestoreCaptionVersion(uploadId);
  const versions = useCaptionVersions(uploadId, showHistory ? track.language : undefined);
  const rtl = isRtlCaption(track.language);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setDraft(track.segments ?? []);
    setBaseUpdatedAt(track.updated_at ?? null);
    setReport(null);
    setConflict(false);
  }, [track.language, track.segments, track.updated_at]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(track.segments ?? []),
    [draft, track.segments],
  );

  const patch = (index: number, next: Partial<CaptionSegment>) =>
    setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, ...next } : row)));

  const runChecks = useCallback(
    (rows: CaptionSegment[] = draft, action: "quality_check" | "autosave" | "manual_save" = "quality_check") => {
      const next = analyseCaptionTrack({ ...track, segments: rows }, durationSeconds);
      setReport(next);
      void logCaptionAudit({
        uploadId,
        language: track.language,
        action,
        report: next,
        segmentCount: rows.length,
      });
      return next;
    },
    [draft, durationSeconds, track, uploadId],
  );

  const commit = useCallback(
    (rows: CaptionSegment[], mode: "autosave" | "manual_save") => {
      const clean = normalizeSegments(rows);
      if (clean.length === 0) return;
      save.mutate(
        { language: track.language, segments: clean, expectedUpdatedAt: baseUpdatedAt },
        {
          onSuccess: ({ updatedAt }) => {
            setBaseUpdatedAt(updatedAt);
            setLastSavedAt(updatedAt);
            setConflict(false);
            runChecks(clean, mode);
            if (mode === "manual_save") {
              toast({
                title: "Captions saved",
                description: `${languageLabel(track.language)} track updated.`,
              });
            }
            onSaved?.();
          },
          onError: (err) => {
            const message = (err as Error).message;
            if (message === CAPTION_CONFLICT) {
              setConflict(true);
              setAutosave(false);
              toast({
                title: "Someone else edited this track",
                description: "Autosave paused. Load their version, or save yours to overwrite it.",
                variant: "destructive",
              });
              return;
            }
            toast({ title: "Could not save captions", description: message, variant: "destructive" });
          },
        },
      );
    },
    [baseUpdatedAt, onSaved, runChecks, save, track.language],
  );

  // Debounced autosave — never while a conflict is unresolved.
  useEffect(() => {
    if (!autosave || !dirty || conflict || save.isPending) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    const rows = draft;
    autosaveTimer.current = setTimeout(() => commit(rows, "autosave"), AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // `commit` is intentionally excluded: it changes identity on every save and
    // would restart the debounce mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosave, conflict, dirty, draft, save.isPending]);

  const blocksPublish = report ? captionBlocksPublish(report) : false;

  return (
    <div className="space-y-3" data-testid="caption-editor">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground" dir={rtl ? "rtl" : "ltr"}>
          {languageLabel(track.language)}
          {track.source === "mt" ? " · translated" : track.source === "manual" ? " · edited" : " · auto-generated"}
        </span>
        <span className="text-[11px] text-muted-foreground">{draft.length} cues</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Switch
              id="caption-autosave"
              checked={autosave}
              onCheckedChange={setAutosave}
              data-testid="caption-editor-autosave"
            />
            <Label htmlFor="caption-autosave" className="text-[11px] font-normal text-muted-foreground">
              Autosave
            </Label>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-9"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            data-testid="caption-editor-history-toggle"
          >
            <History className="mr-1.5 h-3.5 w-3.5" /> History
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-9"
            onClick={() => runChecks()}
            data-testid="caption-editor-recheck"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-run quality checks
          </Button>
          <Button
            size="sm"
            className="h-9"
            disabled={(!dirty && !conflict) || save.isPending}
            data-testid="caption-editor-save"
            onClick={() => commit(draft, "manual_save")}
          >
            {save.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            {conflict ? "Overwrite" : "Save"}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground" data-testid="caption-editor-save-state">
        {save.isPending
          ? "Saving…"
          : conflict
            ? "Conflict — autosave paused"
            : dirty
              ? autosave
                ? "Unsaved changes — autosaving shortly"
                : "Unsaved changes"
              : lastSavedAt
                ? `Saved at ${new Date(lastSavedAt).toLocaleTimeString()}`
                : "No changes yet"}
      </p>

      {conflict && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-foreground"
          role="alert"
          data-testid="caption-editor-conflict"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
          <span>This track changed in another session since you opened it.</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-9"
            data-testid="caption-editor-conflict-reload"
            onClick={() => {
              setConflict(false);
              onSaved?.();
            }}
          >
            Load latest version
          </Button>
        </div>
      )}

      {report && (
        <div
          className="rounded-lg border border-border bg-muted/30 p-2 text-[11px]"
          data-testid="caption-editor-report"
        >
          <p className="font-medium text-foreground">
            Quality {report.score}/100 · {report.issues.length} issue(s)
            {blocksPublish ? " · review before publishing" : ""}
          </p>
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

      {showHistory && (
        <div
          className="rounded-lg border border-border/60 bg-muted/20 p-2"
          data-testid="caption-editor-history"
        >
          <p className="mb-1.5 text-[11px] font-medium text-foreground">Version history</p>
          {versions.isLoading ? (
            <p className="text-[11px] text-muted-foreground">Loading snapshots…</p>
          ) : (versions.data ?? []).length === 0 ? (
            <p className="text-[11px] text-muted-foreground" data-testid="caption-editor-history-empty">
              No earlier versions yet — the first snapshot is taken when you save an edit.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {(versions.data ?? []).map((version) => (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center gap-2 text-[11px]"
                  data-testid="caption-editor-history-row"
                >
                  <span className="font-mono text-muted-foreground">
                    {new Date(version.created_at).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">{version.segment_count} cues</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-9"
                    data-testid="caption-editor-history-preview"
                    onClick={() => {
                      setDraft(version.segments ?? []);
                      runChecks(version.segments ?? []);
                      toast({
                        title: "Loaded into the editor",
                        description: "Nothing is published until you save or restore.",
                      });
                    }}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={restore.isPending}
                    data-testid="caption-editor-history-restore"
                    onClick={() =>
                      restore.mutate(
                        { versionId: version.id, expectedUpdatedAt: baseUpdatedAt },
                        {
                          onSuccess: (updatedAt) => {
                            setBaseUpdatedAt(updatedAt);
                            setLastSavedAt(updatedAt);
                            setDraft(version.segments ?? []);
                            setConflict(false);
                            void logCaptionAudit({
                              uploadId,
                              language: track.language,
                              action: "rollback",
                              report: analyseCaptionTrack(
                                { ...track, segments: version.segments ?? [] },
                                durationSeconds,
                              ),
                              segmentCount: version.segment_count,
                              extra: { restored_version_id: version.id },
                            });
                            toast({ title: "Version restored" });
                            onSaved?.();
                          },
                          onError: (err) => {
                            const message = (err as Error).message;
                            if (message === CAPTION_CONFLICT) {
                              setConflict(true);
                              setAutosave(false);
                            }
                            toast({
                              title: "Could not restore",
                              description:
                                message === CAPTION_CONFLICT
                                  ? "The track changed in another session — load the latest version first."
                                  : message,
                              variant: "destructive",
                            });
                          },
                        },
                      )
                    }
                  >
                    <RotateCcw className="mr-1.5 h-3 w-3" /> Restore
                  </Button>
                </li>
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
