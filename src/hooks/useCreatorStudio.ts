/**
 * Creator ecosystem client layer.
 *
 * Handles creator-account onboarding, resumable-ish direct-to-storage uploads
 * via server-minted signed URLs, and submission into the moderation queue.
 * Nothing here can publish content — approval is a moderator-only action.
 */
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
      const { data, error } = await supabase
        .from("creator_accounts")
        .select("id,user_id,display_name,handle,bio,country,languages,status,strikes")
        .eq("user_id", user!.id)
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
      const { data, error } = await supabase
        .from("creator_uploads")
        .select(
          "id,title,description,language,category,status,visual_state,moderation_reason,review_notes,duration_seconds,view_count,published_at,created_at",
        )
        .eq("user_id", user!.id)
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
  thumbnail?: File | null;
}

export interface UploadProgress {
  phase: "idle" | "validating" | "uploading" | "submitting" | "done" | "error";
  percent: number;
  message: string | null;
}

/** Reads the intrinsic duration of a local video file (best-effort). */
async function probeDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? Math.round(el.duration) : null);
    el.onerror = () => done(null);
    el.src = url;
    window.setTimeout(() => done(null), 8000);
  });
}

export function useCreatorUpload() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress>({
    phase: "idle",
    percent: 0,
    message: null,
  });

  const reset = useCallback(() => setProgress({ phase: "idle", percent: 0, message: null }), []);

  const upload = useCallback(
    async (input: UploadInput): Promise<{ ok: boolean; message: string }> => {
      setProgress({ phase: "validating", percent: 5, message: "Checking your video…" });

      const duration = await probeDuration(input.file);

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
            thumbnail_content_type: input.thumbnail?.type ?? undefined,
          },
        },
      );

      if (initError || !init?.upload_id) {
        const message =
          (init as { message?: string } | null)?.message ??
          initError?.message ??
          "We couldn't start this upload.";
        setProgress({ phase: "error", percent: 0, message });
        return { ok: false, message };
      }

      setProgress({ phase: "uploading", percent: 15, message: "Uploading video…" });

      const { error: videoError } = await supabase.storage
        .from(init.bucket)
        .uploadToSignedUrl(init.video.path, init.video.token, input.file, {
          contentType: input.file.type,
        });
      if (videoError) {
        const message = "Upload failed — please check your connection and retry.";
        setProgress({ phase: "error", percent: 0, message });
        return { ok: false, message };
      }

      if (input.thumbnail && init.thumbnail) {
        setProgress({ phase: "uploading", percent: 80, message: "Uploading thumbnail…" });
        await supabase.storage
          .from(init.bucket)
          .uploadToSignedUrl(init.thumbnail.path, init.thumbnail.token, input.thumbnail, {
            contentType: input.thumbnail.type,
          });
      }

      setProgress({ phase: "submitting", percent: 92, message: "Sending to moderation…" });
      const { data: submitted, error: submitError } = await supabase.functions.invoke(
        "creator-upload-submit",
        { body: { upload_id: init.upload_id } },
      );
      if (submitError || !submitted?.ok) {
        const message =
          (submitted as { reason?: string } | null)?.reason
            ? "This video was blocked by the halal content policy."
            : submitError?.message ?? "Submission failed.";
        setProgress({ phase: "error", percent: 0, message });
        return { ok: false, message };
      }

      await queryClient.invalidateQueries({ queryKey: ["creator-uploads"] });
      setProgress({
        phase: "done",
        percent: 100,
        message: "Submitted. A reviewer will check it shortly.",
      });
      return { ok: true, message: "Submitted for review." };
    },
    [queryClient],
  );

  return { upload, progress, reset };
}

/** Signed playback URL for an approved (or own/pending) native upload. */
export function useUploadPlayback(uploadId: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!uploadId);

  useEffect(() => {
    if (!uploadId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error: fnError } = await supabase.functions.invoke("creator-media-url", {
        body: { upload_id: uploadId },
      });
      if (!active) return;
      if (fnError || !data?.url) {
        setError("This video isn't available.");
      } else {
        setUrl(data.url as string);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [uploadId]);

  return { url, error, loading };
}
