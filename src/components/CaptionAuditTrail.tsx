/**
 * Caption quality audit trail.
 *
 * Shows, newest first, every quality check and editor action recorded for an
 * upload: the score at the time, which thresholds fired, and who acted. Both
 * creators and moderators can download the same log as CSV, so a disputed
 * publishing decision can be reconstructed after the fact.
 */
import { useQuery } from "@tanstack/react-query";
import { Download, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  downloadCaptionAuditCsv,
  type CaptionAuditRow,
} from "@/lib/captionAudit";
import { languageLabel } from "@/components/LaneToggle";

interface Props {
  uploadId: string;
  language?: string;
  testId?: string;
}

const ACTION_LABELS: Record<string, string> = {
  quality_check: "Quality check",
  autosave: "Autosaved",
  manual_save: "Saved",
  rollback: "Rolled back",
  publish_review: "Publish review",
  translate_requested: "Translation requested",
  generate_requested: "Generation requested",
};

export function useCaptionAudits(uploadId: string | undefined, language?: string) {
  return useQuery({
    queryKey: ["caption-audits", uploadId, language ?? "all"],
    enabled: Boolean(uploadId),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CaptionAuditRow[]> => {
      let query = supabase
        .from("caption_quality_audits")
        .select(
          "id, upload_id, language, action, score, segment_count, issues, thresholds, actor_id, actor_role, created_at",
        )
        .eq("upload_id", uploadId as string)
        .order("created_at", { ascending: false })
        .limit(100);
      if (language) query = query.eq("language", language);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as CaptionAuditRow[];
    },
  });
}

const CaptionAuditTrail = ({ uploadId, language, testId = "caption-audit-trail" }: Props) => {
  const audits = useCaptionAudits(uploadId, language);
  const rows = audits.data ?? [];

  return (
    <section className="space-y-2" data-testid={testId} aria-label="Caption quality audit trail">
      <div className="flex items-center gap-2">
        <ScrollText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <h4 className="text-xs font-medium text-foreground">Caption audit trail</h4>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-9"
          disabled={rows.length === 0}
          data-testid={`${testId}-download`}
          onClick={() => downloadCaptionAuditCsv(rows, `caption-audit-${uploadId}.csv`)}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {audits.isLoading ? (
        <p className="text-[11px] text-muted-foreground">Loading audit entries…</p>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground" data-testid={`${testId}-empty`}>
          No caption checks recorded yet — run the quality checks to start the log.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row) => {
            const tripped = ((row.thresholds ?? {}) as { tripped?: string[] }).tripped ?? [];
            return (
              <li
                key={row.id}
                className="rounded-lg border border-border/60 bg-muted/20 p-2 text-[11px]"
                data-testid={`${testId}-row`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-foreground">
                    {ACTION_LABELS[row.action] ?? row.action}
                  </span>
                  <span className="text-muted-foreground">{languageLabel(row.language)}</span>
                  {row.score !== null && (
                    <span className="text-muted-foreground">score {row.score}/100</span>
                  )}
                  <span className="ml-auto font-mono text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </div>
                {tripped.length > 0 && (
                  <p className="mt-0.5 text-muted-foreground">
                    Thresholds tripped: {tripped.join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default CaptionAuditTrail;
