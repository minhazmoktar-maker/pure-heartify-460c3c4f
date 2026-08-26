/**
 * Captions for native Heartify uploads.
 *
 * Reads whatever languages are already generated (`creator_upload_captions`),
 * turns them into WebVTT blob URLs the <video> element can consume as
 * <track> children, and can request an on-demand translation into any
 * supported locale through the `creator-captions` function.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
}

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

export function useUploadCaptions(uploadId: string | undefined) {
  return useQuery({
    queryKey: ["upload-captions", uploadId],
    enabled: Boolean(uploadId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CaptionTrack[]> => {
      const { data, error } = await supabase
        .from("creator_upload_captions")
        .select("language, source, segment_count, segments")
        .eq("upload_id", uploadId as string)
        .order("source", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as CaptionTrack[]).filter((t) => t.segment_count > 0);
    },
  });
}

/** Ask the pipeline for captions (no language) or a translation (language). */
export function useRequestCaptions(uploadId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (language?: string) => {
      if (!uploadId) throw new Error("missing upload");
      const { data, error } = await supabase.functions.invoke("creator-captions", {
        body: language ? { upload_id: uploadId, language } : { upload_id: uploadId },
      });
      if (error) throw error;
      return data as CaptionTrack;
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
