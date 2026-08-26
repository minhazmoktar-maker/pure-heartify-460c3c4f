/**
 * Caption quality warnings for creators.
 *
 * Runs the deterministic checks in `captionQuality.ts` against every generated
 * track for an upload and surfaces the problems in Studio — timing overlaps,
 * empty/missing cues and sync drift — so they can be fixed before the video is
 * published rather than after viewers complain.
 */
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { useUploadCaptions } from "@/hooks/useUploadCaptions";
import { analyseCaptionTracks, worstCaptionScore } from "@/lib/captionQuality";
import { languageLabel } from "@/components/LaneToggle";

interface Props {
  uploadId: string;
  durationSeconds?: number | null;
}

const CaptionQualityPanel = ({ uploadId, durationSeconds }: Props) => {
  const captions = useUploadCaptions(uploadId);
  const reports = analyseCaptionTracks(captions.data, durationSeconds);
  const worst = worstCaptionScore(reports);

  if (captions.isLoading) {
    return (
      <p
        data-testid="caption-quality-loading"
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground"
      >
        <Loader2 className="h-3 w-3 animate-spin" /> Checking caption quality…
      </p>
    );
  }

  if (reports.length === 0) {
    return (
      <p data-testid="caption-quality-none" className="mt-2 text-[11px] text-muted-foreground">
        Captions not generated yet — quality checks run automatically once they are ready.
      </p>
    );
  }

  const warnings = reports.flatMap((r) =>
    r.issues.map((issue) => ({ ...issue, language: r.language })),
  );

  return (
    <div
      data-testid="caption-quality-panel"
      className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2.5"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
        {warnings.length === 0 ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        )}
        Caption quality {worst !== null ? `${worst}/100` : ""} ·{" "}
        {reports.map((r) => languageLabel(r.language)).join(", ")}
      </p>
      {warnings.length === 0 ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          No timing overlaps, missing cues or sync drift detected.
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1" data-testid="caption-quality-issues">
          {warnings.slice(0, 6).map((issue, index) => (
            <li
              key={`${issue.language}-${issue.code}-${index}`}
              className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
            >
              {issue.severity === "warning" ? (
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
              )}
              <span>
                <span className="uppercase">{issue.language}</span> · {issue.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CaptionQualityPanel;
