// Caption quality alerts.
//
// Auto-generated captions occasionally come out wrong: cues overlap, a stretch
// of the video has no cues at all, or the whole track is drifted from the audio.
// Publishing that silently is worse than having no captions, so every generated
// or translated track is scored here and a failing track raises an in-app
// notification for the creator and for moderators, deep-linked straight to the
// review panel.
//
// Thresholds mirror src/lib/captionQuality.ts so client and server agree on
// what "failing" means.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

export const CAPTION_SCORE_FAIL = 70;
export const CAPTION_DRIFT_SECONDS = 12;

type Segment = { start_ms: number; end_ms: number | null; text: string };

export interface CaptionCheck {
  score: number;
  driftSeconds: number;
  overlaps: number;
  emptyCues: number;
  failed: boolean;
  reasons: string[];
}

/** Deterministic quality scan of one track. No network, no model calls. */
export function checkCaptionTrack(
  segments: Segment[],
  durationSeconds?: number | null,
): CaptionCheck {
  const rows = [...segments].sort((a, b) => a.start_ms - b.start_ms);
  const reasons: string[] = [];
  let penalty = 0;

  if (rows.length === 0) {
    return {
      score: 0,
      driftSeconds: 0,
      overlaps: 0,
      emptyCues: 0,
      failed: true,
      reasons: ["track has no cues"],
    };
  }

  const emptyCues = rows.filter((s) => !(s.text ?? "").trim()).length;
  if (emptyCues > 0) {
    penalty += Math.min(20, emptyCues * 4);
    reasons.push(`${emptyCues} empty cue(s)`);
  }

  let overlaps = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const prevEnd = rows[i - 1].end_ms;
    if (prevEnd !== null && prevEnd !== undefined && rows[i].start_ms < prevEnd - 1) overlaps += 1;
  }
  if (overlaps > 0) {
    penalty += Math.min(30, overlaps * 5);
    reasons.push(`${overlaps} timing overlap(s)`);
  }

  const driftSeconds = rows[0].start_ms / 1000;
  if (driftSeconds > CAPTION_DRIFT_SECONDS) {
    penalty += 20;
    reasons.push(`captions start ${Math.round(driftSeconds)}s after the video (sync drift)`);
  }

  if (durationSeconds && durationSeconds > 0) {
    const last = rows[rows.length - 1];
    const covered = ((last.end_ms ?? last.start_ms) / 1000) / durationSeconds;
    if (covered < 0.6) {
      penalty += 25;
      reasons.push(`only ${Math.round(covered * 100)}% of the video is captioned`);
    }
  }

  const score = Math.max(0, 100 - penalty);
  return { score, driftSeconds, overlaps, emptyCues, failed: score < CAPTION_SCORE_FAIL, reasons };
}

/**
 * Notify the creator and moderators when a track fails its checks.
 *
 * In-app only: these are workflow alerts, not engagement pushes, so they never
 * consume the user's 3-per-week push budget. Idempotent per upload+language —
 * a repeated sweep on the same bad track does not re-notify.
 */
export async function notifyCaptionQuality(
  admin: SupabaseClient,
  args: {
    uploadId: string;
    language: string;
    check: CaptionCheck;
    creatorId?: string | null;
    title?: string | null;
  },
): Promise<{ notified: number }> {
  if (!args.check.failed) return { notified: 0 };

  const kind = "caption_quality_failed";
  const dedupeKey = `${args.uploadId}:${args.language}`;
  const { data: seen } = await admin
    .from("user_notifications")
    .select("id")
    .eq("kind", kind)
    .filter("data->>dedupe_key", "eq", dedupeKey)
    .limit(1);
  if (seen && seen.length > 0) return { notified: 0 };

  const recipients = new Set<string>();
  if (args.creatorId) recipients.add(args.creatorId);
  const { data: mods } = await admin
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "moderator"]);
  for (const row of mods ?? []) if (row.user_id) recipients.add(row.user_id as string);
  if (recipients.size === 0) return { notified: 0 };

  const link = `/studio?captions=${args.uploadId}&lang=${encodeURIComponent(args.language)}`;
  const rows = [...recipients].map((user_id) => ({
    user_id,
    kind,
    title: "Captions need a look before publishing",
    body: `${args.title ?? "An upload"} · ${args.language.toUpperCase()} captions scored ${
      args.check.score
    }/100 — ${args.check.reasons.join("; ")}.`,
    data: {
      channel: "in_app",
      dedupe_key: dedupeKey,
      upload_id: args.uploadId,
      language: args.language,
      score: args.check.score,
      drift_seconds: Math.round(args.check.driftSeconds),
      url: link,
    },
  }));

  const { error } = await admin.from("user_notifications").insert(rows);
  if (error) return { notified: 0 };
  return { notified: rows.length };
}
