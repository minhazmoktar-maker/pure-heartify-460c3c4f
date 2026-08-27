/**
 * Creator ecosystem client layer.
 *
 * Handles creator-account onboarding, resumable chunked uploads straight to
 * storage (TUS, 6MB chunks, survives network drops), and submission into the
 * moderation queue. Nothing here can publish content — approval is a
 * moderator-only action.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uploadResumable } from "@/lib/resumableUpload";
import { detectLanguage, generateThumbnail, probeDuration } from "@/lib/uploadMedia";

/** Shape returned by the creator-upload-init edge function. */
interface InitResult {
  upload_id: string;
  bucket: string;
  video: { path: string; token: string };
  thumbnail: { path: string; token: string } | null;
}



export interface CreatorAccount {
  id: string;
  user_id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  country: string | null;
  languages: string[];
  status: string;
  strikes: number;
}

export type UploadStatus =
  | "draft"
  | "uploading"
  | "pending_review"
  | "approved"
  | "rejected"
  | "removed";

export interface CreatorUpload {
  id: string;
  title: string;
  description: string | null;
  language: string;
  category: string | null;
  status: UploadStatus;
  visual_state: string;
  moderation_reason: string | null;
  review_notes: string | null;
  duration_seconds: number | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

export const UPLOAD_LANGUAGES = [
  { code: "bn", label: "বাংলা — Bengali" },
  { code: "en", label: "English" },
  { code: "ur", label: "اردو — Urdu" },
  { code: "hi", label: "हिन्दी — Hindi" },
  { code: "ar", label: "العربية — Arabic" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "tr", label: "Türkçe" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];

export const UPLOAD_CATEGORIES = [
  "quran",
  "tafsir",
  "hadith",
  "seerah",
  "fiqh",
  "aqeedah",
  "dawah",
  "history",
  "education",
  "productivity",
  "family",
  "kids",
];

export function useCreatorAccount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["creator-account", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<CreatorAccount | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("creator_accounts")
        .select("id,user_id,display_name,handle,bio,country,languages,status,strikes")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as CreatorAccount | null) ?? null;
    },
  });
}

export function useMyUploads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["creator-uploads", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async (): Promise<CreatorUpload[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("creator_uploads")
        .select(
          "id,title,description,language,category,status,visual_state,moderation_reason,review_notes,duration_seconds,view_count,published_at,created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as CreatorUpload[];
    },
  });
}

export interface UploadInput {
  title: string;
  description: string;
  language: string;
  category: string;
  file: File;
  /** Optional creator-supplied cover. Omit to auto-generate from the video. */
  thumbnail?: File | null;
}

export interface UploadProgress {
  phase: "idle" | "validating" | "uploading" | "submitting" | "done" | "error";
  percent: number;
  message: string | null;
  /** True when the current attempt continued a previously interrupted upload. */
  resumed: boolean;
  /** Set when the attempt failed in a way the creator can retry. */
  retryable: boolean;
}

const IDLE: UploadProgress = {
  phase: "idle",
  percent: 0,
  message: null,
  resumed: false,
  retryable: false,
};

export function useCreatorUpload() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  /** Keeps the init result so a retry resumes instead of creating a new row. */
  const pendingRef = useRef<{ input: UploadInput; init: InitResult } | null>(null);

  const reset = useCallback(() => {
    pendingRef.current = null;
    setProgress(IDLE);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runTransfer = useCallback(
    async (input: UploadInput, init: InitResult): Promise<{ ok: boolean; message: string }> => {
      const controller = new AbortController();
      abortRef.current = controller;

      setProgress((p) => ({
        ...p,
        phase: "uploading",
        percent: 12,
        message: "Uploading video…",
        retryable: false,
      }));

      const videoResult = await uploadResumable({
        bucket: init.bucket,
        objectPath: init.video.path,
        file: input.file,
        contentType: input.file.type,
        signal: controller.signal,
        onProgress: (fraction) => {
          setProgress((p) => ({
            ...p,
            phase: "uploading",
            percent: Math.min(88, 12 + Math.round(fraction * 74)),
            message: `Uploading video… ${Math.round(fraction * 100)}%`,
          }));
        },
      });

      if (!videoResult.ok) {
        const message = videoResult.error ?? "Upload interrupted.";
        setProgress({
          phase: "error",
          percent: 0,
          message,
          resumed: videoResult.resumed,
          retryable: true,
        });
        return { ok: false, message };
      }

      if (init.thumbnail && input.thumbnail) {
        setProgress((p) => ({ ...p, percent: 90, message: "Uploading cover image…" }));
        await uploadResumable({
          bucket: init.bucket,
          objectPath: init.thumbnail.path,
          file: input.thumbnail,
          contentType: input.thumbnail.type,
        });
      }

      setProgress((p) => ({
        ...p,
        phase: "submitting",
        percent: 94,
        message: "Sending to moderation…",
      }));

      const { data: submitted, error: submitError } = await supabase.functions.invoke(
        "creator-upload-submit",
        { body: { upload_id: init.upload_id } },
      );
      if (submitError || !submitted?.ok) {
        const blocked = (submitted as { reason?: string } | null)?.reason;
        const message = blocked
          ? "This video was blocked by the halal content policy."
          : submitError?.message ?? "Submission failed.";
        setProgress({
          phase: "error",
          percent: 0,
          message,
          resumed: videoResult.resumed,
          retryable: !blocked,
        });
        return { ok: false, message };
      }

      pendingRef.current = null;
      await queryClient.invalidateQueries({ queryKey: ["creator-uploads"] });
      setProgress({
        phase: "done",
        percent: 100,
        message: "Submitted. A reviewer will check it shortly.",
        resumed: videoResult.resumed,
        retryable: false,
      });
      return { ok: true, message: "Submitted for review." };
    },
    [queryClient],
  );

  const upload = useCallback(
    async (input: UploadInput): Promise<{ ok: boolean; message: string }> => {
      setProgress({
        phase: "validating",
        percent: 5,
        message: "Reading your video…",
        resumed: false,
        retryable: false,
      });

      // Auto-detect duration, cover frame and language before any bytes move.
      const duration = await probeDuration(input.file);
      let thumbnail = input.thumbnail ?? null;
      let thumbnailAuto = false;
      if (!thumbnail) {
        const generated = await generateThumbnail(input.file, duration);
        if (generated) {
          thumbnail = generated.file;
          thumbnailAuto = true;
        }
      }
      const guess = detectLanguage(`${input.title} ${input.description}`);

      const { data: init, error: initError } = await supabase.functions.invoke(
        "creator-upload-init",
        {
          body: {
            title: input.title,
            description: input.description,
            language: input.language,
            category: input.category,
            content_type: input.file.type,
            size_bytes: input.file.size,
            duration_seconds: duration,
            duration_auto: duration != null,
            thumbnail_content_type: thumbnail?.type ?? undefined,
            thumbnail_auto: thumbnailAuto,
            detected_language: guess?.code,
            language_confidence: guess?.confidence,
          },
        },
      );

      if (initError || !init?.upload_id) {
        const message =
          (init as { message?: string } | null)?.message ??
          initError?.message ??
          "We couldn't start this upload.";
        setProgress({ phase: "error", percent: 0, message, resumed: false, retryable: false });
        return { ok: false, message };
      }

      const prepared: UploadInput = { ...input, thumbnail };
      pendingRef.current = { input: prepared, init: init as InitResult };
      return runTransfer(prepared, init as InitResult);
    },
    [runTransfer],
  );

  /** Continues the last interrupted transfer from the final completed chunk. */
  const retry = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    const pending = pendingRef.current;
    if (!pending) return { ok: false, message: "Nothing to resume." };
    return runTransfer(pending.input, pending.init);
  }, [runTransfer]);

  return { upload, retry, cancel, progress, reset, canResume: pendingRef.current !== null };
}

/**
 * Signed playback URL for an approved (or own/pending) native upload.
 *
 * Signed URLs live for an hour server-side, so they are cached in-memory for a
 * shorter window: reopening a review panel (or navigating back to a watch page)
 * reuses the URL instead of spending another `creator-media-url` call. Closing
 * the panel unmounts the hook, which aborts any in-flight request.
 *
 * `context` records *why* the URL was requested ("review_panel", "watch",
 * "admin_review"). Monitoring alerts on requests with no context, which is the
 * signature of a panel fetching without being opened.
 */
const PLAYBACK_CACHE_TTL_MS = 45 * 60 * 1000; // signed URLs are valid for 60 min
const playbackCache = new Map<string, { url: string; expiresAt: number }>();

/** Test/QA helper — drops memoised signed URLs. */
export function clearUploadPlaybackCache() {
  playbackCache.clear();
}

export type PlaybackContext = "review_panel" | "watch" | "admin_review";

export function useUploadPlayback(
  uploadId: string | undefined,
  context: PlaybackContext = "watch",
) {
  const cached = uploadId ? playbackCache.get(uploadId) : undefined;
  const fresh = cached && cached.expiresAt > Date.now() ? cached.url : null;
  const [url, setUrl] = useState<string | null>(fresh);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!uploadId && !fresh);

  useEffect(() => {
    if (!uploadId) return;
    const hit = playbackCache.get(uploadId);
    if (hit && hit.expiresAt > Date.now()) {
      setUrl(hit.url);
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      const { data, error: fnError } = await supabase.functions.invoke("creator-media-url", {
        body: { upload_id: uploadId, context },
        signal: controller.signal,
      });
      if (!active) return;
      if (fnError || !data?.url) {
        setError("This video isn't available.");
      } else {
        const signed = data.url as string;
        playbackCache.set(uploadId, { url: signed, expiresAt: Date.now() + PLAYBACK_CACHE_TTL_MS });
        setUrl(signed);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
      // Panel closed / page left mid-flight: stop the request outright.
      controller.abort();
    };
  }, [uploadId, context]);

  return { url, error, loading };
}

