/**
 * Caption quality audit trail.
 *
 * A caption track can be re-generated, translated, hand-edited, rolled back and
 * re-checked many times before it is published. When something ships wrong, the
 * question is always "what did the checks say at the time, which threshold
 * fired, and who acted on it?" — so every check and every editor action is
 * recorded with the score, the exact issues, and the thresholds in force.
 *
 * Writes are best-effort: an audit row must never block a creator from saving.
 */
import { supabase } from "@/integrations/supabase/client";
import { CAPTION_QUALITY_THRESHOLDS, type CaptionQualityReport } from "@/lib/captionQuality";

export type CaptionAuditAction =
  | "quality_check"
  | "autosave"
  | "manual_save"
  | "rollback"
  | "publish_review"
  | "translate_requested"
  | "generate_requested";

export interface CaptionAuditRow {
  id: string;
  upload_id: string;
  language: string;
  action: string;
  score: number | null;
  segment_count: number | null;
  issues: unknown;
  thresholds: unknown;
  actor_id: string | null;
  actor_role: string | null;
  created_at: string;
}

/** Which configured thresholds this report actually tripped. */
export function trippedThresholds(report: CaptionQualityReport | null | undefined): string[] {
  if (!report) return [];
  const tripped = new Set<string>();
  for (const issue of report.issues) tripped.add(issue.code);
  if (report.score < CAPTION_QUALITY_THRESHOLDS.minPublishScore) tripped.add("min_publish_score");
  if (report.leadingSilence >= CAPTION_QUALITY_THRESHOLDS.driftSeconds) tripped.add("sync_drift");
  if (
    report.coveragePct !== null &&
    report.coveragePct < CAPTION_QUALITY_THRESHOLDS.minCoveragePct
  ) {
    tripped.add("min_coverage");
  }
  return [...tripped];
}

export async function logCaptionAudit(args: {
  uploadId: string;
  language: string;
  action: CaptionAuditAction;
  report?: CaptionQualityReport | null;
  segmentCount?: number;
  extra?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const actorId = sessionData.session?.user?.id ?? null;
    if (!actorId) return; // RLS requires actor_id = auth.uid()
    await supabase.from("caption_quality_audits").insert({
      upload_id: args.uploadId,
      language: args.language,
      action: args.action,
      score: args.report?.score ?? null,
      segment_count: args.segmentCount ?? args.report?.segments ?? null,
      issues: (args.report?.issues ?? []) as unknown as never,
      thresholds: {
        ...CAPTION_QUALITY_THRESHOLDS,
        tripped: trippedThresholds(args.report),
        ...(args.extra ?? {}),
      } as unknown as never,
      actor_id: actorId,
    });
  } catch {
    /* audit writes are advisory; never block the editor */
  }
}

const CSV_COLUMNS = [
  "created_at",
  "upload_id",
  "language",
  "action",
  "score",
  "segment_count",
  "tripped_thresholds",
  "issues",
  "actor_id",
] as const;

function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** Downloadable audit log (CSV) for creators and admins. */
export function captionAuditCsv(rows: CaptionAuditRow[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) {
    const thresholds = (row.thresholds ?? {}) as { tripped?: string[] };
    const issues = Array.isArray(row.issues)
      ? (row.issues as Array<{ code?: string; message?: string }>)
          .map((i) => i.code ?? i.message ?? "")
          .join("; ")
      : "";
    lines.push(
      [
        row.created_at,
        row.upload_id,
        row.language,
        row.action,
        row.score,
        row.segment_count,
        (thresholds.tripped ?? []).join("; "),
        issues,
        row.actor_id,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadCaptionAuditCsv(rows: CaptionAuditRow[], filename: string) {
  const blob = new Blob([captionAuditCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
