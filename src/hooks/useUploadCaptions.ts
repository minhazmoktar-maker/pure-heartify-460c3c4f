/**
 * Captions for native Heartify uploads.
 *
 * Reads whatever languages are already generated (`creator_upload_captions`),
 * turns them into WebVTT blob URLs the <video> element can consume as
 * <track> children, and can request an on-demand translation into any
 * supported locale through the `creator-captions` function.
 *
 * Editing is optimistically concurrent: every track carries its `updated_at`,
 * and a save only lands if that timestamp still matches the row in the
 * database. Two people editing the same Arabic track therefore get a clear
 * conflict instead of one silently overwriting the other. Every overwritten
 * state is snapshotted server-side into `caption_track_versions`, so any edit
 * can be rolled back before publishing.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startCaptionTimer } from "@/lib/captionPerf";

export interface CaptionSegment {
  start_ms: number;
  end_ms: number | null;
  text: string;
}

export interface CaptionTrack {
  language: string;
  source: string;
  segment_count: number;
  segments: CaptionSegment[];
  /** Concurrency token — pass back on save to detect a conflicting edit. */
  updated_at?: string;
}

export interface CaptionVersion {
  id: string;
  language: string;
  segments: CaptionSegment[];
  segment_count: number;
  source: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

/** Thrown when someone else changed the track since it was loaded. */
export const CAPTION_CONFLICT = "caption_conflict";

const TRACK_COLUMNS = "language, source, segment_count, segments, updated_at";

function vttTime(ms: number): string {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const cs = total % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs, 3)}`;
}

export function toVtt(segments: CaptionSegment[]): string {
  const lines = ["WEBVTT", ""];
  segments.forEach((seg, i) => {
    const end = seg.end_ms ?? seg.start_ms + 3000;
    lines.push(String(i + 1));
    lines.push(`${vttTime(seg.start_ms)} --> ${vttTime(Math.max(end, seg.start_ms + 600))}`);
    lines.push(seg.text);
    lines.push("");
  });
  return lines.join("\n");
}

/** Normalise a hand-edited draft into a track that can always be played. */
export function normalizeSegments(segments: CaptionSegment[]): CaptionSegment[] {
  return segments
    .map((s) => ({
      start_ms: Math.max(0, Math.round(s.start_ms)),
      end_ms: s.end_ms === null || s.end_ms === undefined ? null : Math.max(0, Math.round(s.end_ms)),
      text: (s.text ?? "").trim(),
    }))
    .filter((s) => s.text.length > 0)
    .sort((a, b) => a.start_ms - b.start_ms);
}

async function fetchTracks(uploadId: string): Promise<CaptionTrack[]> {
  const { data, error } = await supabase
    .from("creator_upload_captions")
    .select(TRACK_COLUMNS)
    .eq("upload_id", uploadId)
    .order("source", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as CaptionTrack[]).filter((t) => t.segment_count > 0);
}

export function useUploadCaptions(uploadId: string | undefined) {
  return useQuery({
    queryKey: ["upload-captions", uploadId],
    enabled: Boolean(uploadId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CaptionTrack[]> => {
      const done = startCaptionTimer(uploadId as string, "fetch");
      try {
        const tracks = await fetchTracks(uploadId as string);
        done(tracks.length);
        return tracks;
      } catch (err) {
        done(0);
        throw err;
      }
    },
  });
}

/** Ask the pipeline for captions (no language) or a translation (language). */
export function useRequestCaptions(uploadId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (language?: string) => {
      if (!uploadId) throw new Error("missing upload");
      const done = startCaptionTimer(uploadId, "translate");
      try {
        const { data, error } = await supabase.functions.invoke("creator-captions", {
          body: language ? { upload_id: uploadId, language } : { upload_id: uploadId },
        });
        if (error) throw error;
        done(1);
        return data as CaptionTrack;
      } catch (err) {
        done(0);
        throw err;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["upload-captions", uploadId] });
    },
  });
}

/** Stable blob URLs per caption track, revoked when the tracks change. */
export function useVttUrls(tracks: CaptionTrack[] | undefined) {
  const [, force] = useState(0);
  const urls = useMemo(() => {
    if (!tracks?.length || typeof URL === "undefined") return {} as Record<string, string>;
    const map: Record<string, string> = {};
    for (const t of tracks) {
      map[t.language] = URL.createObjectURL(new Blob([toVtt(t.segments)], { type: "text/vtt" }));
    }
    return map;
  }, [tracks]);

  useEffect(() => {
    force((n) => n + 1);
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [urls]);

  return urls;
}

/**
 * Caption availability for many uploads at once (list surfaces).
 * Returns a map of upload_id -> available tracks (language + source only, so
 * the payload stays small for a 60-row list).
 */
export function useUploadCaptionsIndex(uploadIds: string[] | undefined) {
  const ids = (uploadIds ?? []).filter(Boolean);
  const key = ids.slice().sort().join(",");
  return useQuery({
    queryKey: ["upload-captions-index", key],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, Array<{ language: string; source: string }>>> => {
      const { data, error } = await supabase
        .from("creator_upload_captions")
        .select("upload_id, language, source, segment_count")
        .in("upload_id", ids);
      if (error) throw error;
      const map: Record<string, Array<{ language: string; source: string }>> = {};
      for (const row of (data ?? []) as Array<{
        upload_id: string;
        language: string;
        source: string;
        segment_count: number;
      }>) {
        if (!row.segment_count) continue;
        (map[row.upload_id] ??= []).push({ language: row.language, source: row.source });
      }
      return map;
    },
  });
}

/**
 * Save an edited caption track (creator or moderator; enforced by RLS).
 * Timings are normalised — sorted, non-negative, empty cues dropped — so a
 * hand-edited draft can never regress into an unplayable track.
 *
 * When `expectedUpdatedAt` is supplied the write is conditional: if another
 * editor saved first the update matches zero rows and we surface a conflict
 * rather than clobbering their work.
 */
export function useSaveCaptionTrack(uploadId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      language,
      segments,
      expectedUpdatedAt,
    }: {
      language: string;
      segments: CaptionSegment[];
      expectedUpdatedAt?: string | null;
    }): Promise<{ segments: CaptionSegment[]; updatedAt: string }> => {
      if (!uploadId) throw new Error("missing upload");
      const clean = normalizeSegments(segments);
      if (clean.length === 0) throw new Error("a caption track needs at least one cue with text");
      const updatedAt = new Date().toISOString();
      let query = supabase
        .from("creator_upload_captions")
        .update({
          segments: clean as unknown as never,
          segment_count: clean.length,
          source: "manual",
          updated_at: updatedAt,
        })
        .eq("upload_id", uploadId)
        .eq("language", language);
      if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
      const { data, error } = await query.select("updated_at");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(CAPTION_CONFLICT);
      return { segments: clean, updatedAt };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["upload-captions", uploadId] });
      void qc.invalidateQueries({ queryKey: ["upload-captions-index"] });
      void qc.invalidateQueries({ queryKey: ["caption-versions", uploadId] });
      void qc.invalidateQueries({ queryKey: ["caption-audits", uploadId] });
    },
  });
}

/** Snapshot history for one track, newest first. */
export function useCaptionVersions(uploadId: string | undefined, language: string | undefined) {
  return useQuery({
    queryKey: ["caption-versions", uploadId, language],
    enabled: Boolean(uploadId && language),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CaptionVersion[]> => {
      const { data, error } = await supabase
        .from("caption_track_versions")
        .select("id, language, segments, segment_count, source, note, created_by, created_at")
        .eq("upload_id", uploadId as string)
        .eq("language", language as string)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as CaptionVersion[];
    },
  });
}

/** Roll a track back to a snapshot, refusing if someone else edited meanwhile. */
export function useRestoreCaptionVersion(uploadId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      versionId,
      expectedUpdatedAt,
    }: {
      versionId: string;
      expectedUpdatedAt?: string | null;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc("restore_caption_version", {
        p_version_id: versionId,
        p_expected_updated_at: expectedUpdatedAt ?? null,
      });
      if (error) {
        throw new Error(error.message.includes(CAPTION_CONFLICT) ? CAPTION_CONFLICT : error.message);
      }
      return data as unknown as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["upload-captions", uploadId] });
      void qc.invalidateQueries({ queryKey: ["caption-versions", uploadId] });
      void qc.invalidateQueries({ queryKey: ["caption-audits", uploadId] });
    },
  });
}

/**
 * Prefetch the caption tracks a viewer is most likely to need next — the cards
 * currently on screen, or the next few videos queued behind the one playing.
 * Timed through `captionPerf` so slow caption loads are measurable rather than
 * anecdotal, and capped so a long feed never turns into a request storm.
 */
export function usePrefetchUploadCaptions(uploadIds: string[] | undefined, limit = 8) {
  const qc = useQueryClient();
  const key = (uploadIds ?? []).filter(Boolean).slice(0, limit).join(",");
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    let cancelled = false;
    (async () => {
      for (const id of ids) {
        if (cancelled) return;
        if (qc.getQueryData(["upload-captions", id])) continue;
        const done = startCaptionTimer(id, "prefetch");
        try {
          const tracks = await qc.fetchQuery({
            queryKey: ["upload-captions", id],
            staleTime: 5 * 60 * 1000,
            queryFn: () => fetchTracks(id),
          });
          done((tracks as CaptionTrack[]).length);
        } catch {
          done(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, qc, limit]);
}
