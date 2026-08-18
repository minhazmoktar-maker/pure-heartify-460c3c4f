import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TranscriptSegment = {
  start_ms: number;
  end_ms: number | null;
  text: string;
};

export type TranscriptData = {
  language: string;
  source: string;
  segmentCount: number;
  segments: TranscriptSegment[];
};

export type TranscriptStatus = "queued" | "running" | "done" | "failed" | null;

/**
 * Transcript for a single video. Public read (RLS allows anon), so it works for
 * signed-out and deep-linked visitors. Returns null when the video has not been
 * transcribed yet, which the UI turns into a "request transcript" affordance.
 */
export function useTranscript(videoId: string | undefined) {
  return useQuery({
    queryKey: ["transcript", videoId],
    enabled: !!videoId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<TranscriptData | null> => {
      if (!videoId) return null;
      const { data: header, error: headerError } = await supabase
        .from("video_transcripts")
        .select("language, source, segment_count")
        .eq("video_id", videoId)
        .maybeSingle();
      if (headerError) throw headerError;
      if (!header) return null;

      const { data: segments, error: segError } = await supabase
        .from("transcript_segments")
        .select("start_ms, end_ms, text")
        .eq("video_id", videoId)
        .order("start_ms", { ascending: true })
        .limit(4000);
      if (segError) throw segError;

      return {
        language: header.language,
        source: header.source,
        segmentCount: header.segment_count,
        segments: (segments ?? []) as TranscriptSegment[],
      };
    },
  });
}

/** Queue position/state for a video that has no transcript yet. */
export function useTranscriptJob(videoId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["transcript-job", videoId],
    enabled: !!videoId && enabled,
    refetchInterval: 30_000,
    queryFn: async (): Promise<TranscriptStatus> => {
      if (!videoId) return null;
      const { data } = await supabase
        .from("transcript_jobs")
        .select("status")
        .eq("video_id", videoId)
        .maybeSingle();
      return (data?.status as TranscriptStatus) ?? null;
    },
  });
}

/** Ask the pipeline to transcribe this video (signed-in members only). */
export function useRequestTranscript(videoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (languageHint?: string) => {
      if (!videoId) throw new Error("missing video id");
      const { data, error } = await supabase.rpc("enqueue_transcript_job", {
        _video_id: videoId,
        _language_hint: languageHint ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transcript-job", videoId] });
    },
  });
}

/** In-video search: the exact spoken moments matching a query. */
export function useTranscriptMoments(query: string, videoId?: string, limit = 20) {
  const q = query.trim();
  return useQuery({
    queryKey: ["transcript-moments", q, videoId ?? null, limit],
    enabled: q.length >= 2,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_transcript_moments", {
        _q: q,
        _limit: limit,
        _video_id: videoId ?? null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Languages the translation pipeline supports (mirrors translate-transcript). */
export const TRANSCRIPT_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "bn", label: "বাংলা" },
  { code: "ur", label: "اردو" },
  { code: "hi", label: "हिन्दी" },
  { code: "id", label: "Indonesia" },
  { code: "ms", label: "Melayu" },
  { code: "tr", label: "Türkçe" },
  { code: "fa", label: "فارسی" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
  { code: "sw", label: "Kiswahili" },
  { code: "ha", label: "Hausa" },
  { code: "so", label: "Soomaali" },
  { code: "ps", label: "پښتو" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

/**
 * Cached translation of a transcript. Reads are public (anon-readable table) so
 * translated captions work for signed-out and deep-linked visitors too.
 */
export function useTranscriptTranslation(videoId: string | undefined, language: string | null) {
  return useQuery({
    queryKey: ["transcript-translation", videoId, language],
    enabled: !!videoId && !!language,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<TranscriptSegment[] | null> => {
      if (!videoId || !language) return null;
      const { data, error } = await supabase
        .from("transcript_translations")
        .select("segments")
        .eq("video_id", videoId)
        .eq("language", language)
        .maybeSingle();
      if (error) throw error;
      const segments = data?.segments as TranscriptSegment[] | undefined;
      return segments?.length ? segments : null;
    },
  });
}

/** Generate a translation on demand (members only; results are cached for everyone). */
export function useTranslateTranscript(videoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (language: string): Promise<TranscriptSegment[]> => {
      if (!videoId) throw new Error("missing video id");
      const { data, error } = await supabase.functions.invoke("translate-transcript", {
        body: { video_id: videoId, language },
      });
      if (error) throw error;
      const payload = data as { segments?: TranscriptSegment[]; error?: string };
      if (payload?.error) throw new Error(payload.error);
      return payload?.segments ?? [];
    },
    onSuccess: (segments, language) => {
      qc.setQueryData(["transcript-translation", videoId, language], segments);
    },
  });
}
