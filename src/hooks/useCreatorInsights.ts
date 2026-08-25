/**
 * Creator growth, analytics, moderation-trail and appeal hooks.
 *
 * Every read here goes through a security-definer RPC that re-checks the
 * caller: creators only ever see their own numbers, and moderation detail is
 * limited to the upload owner plus the review team.
 */
import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Public creator profile
// ---------------------------------------------------------------------------

export interface ProfileUpload {
  id: string;
  title: string;
  description: string | null;
  language: string;
  category: string | null;
  duration_seconds: number | null;
  view_count: number;
  published_at: string | null;
  status: string;
  visual_state: string;
  flag_reason_code: string | null;
  review_notes: string | null;
}

export interface CreatorProfile {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  country: string | null;
  languages: string[];
  status: string;
  is_owner: boolean;
  joined_at: string;
  subscriber_count: number;
  viewer_subscribed: boolean;
  published_count: number;
  total_views: number;
  uploads: ProfileUpload[];
}

export function useCreatorProfile(handle: string | undefined) {
  return useQuery({
    queryKey: ["creator-profile", handle],
    enabled: Boolean(handle),
    staleTime: 30_000,
    queryFn: async (): Promise<CreatorProfile | null> => {
      const { data, error } = await supabase.rpc("creator_public_profile", {
        p_handle: handle as string,
      });
      if (error) throw error;
      return (data as unknown as CreatorProfile) ?? null;
    },
  });
}

export function useSubscribeToCreator(handle?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async (creatorId: string) => {
      const { data, error } = await supabase.rpc("toggle_creator_subscription", {
        p_creator_id: creatorId,
      });
      if (error) throw error;
      return data as unknown as { subscribed: boolean; subscriber_count: number };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["creator-profile", handle] });
    },
  });

  return { ...mutation, canSubscribe: Boolean(user) };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface VideoAnalytics {
  id: string;
  title: string;
  status: string;
  language: string;
  category: string | null;
  duration_seconds: number | null;
  views: number;
  plays: number;
  watch_seconds: number;
  avg_watch_seconds: number;
  completion_rate: number;
  autoplay_pass_rate: number | null;
  avg_view_pct: number | null;
  last_play: string | null;
  published_at: string | null;
}

export interface CreatorAnalytics {
  generated_at: string;
  window_days: number;
  totals: {
    uploads: number;
    published: number;
    views: number;
    plays: number;
    watch_seconds: number;
    completion_rate: number;
    autoplay_pass_rate: number | null;
    subscribers: number;
  };
  videos: VideoAnalytics[];
}

export function useCreatorAnalytics(days = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["creator-analytics", days, user?.id],
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<CreatorAnalytics | null> => {
      const { data, error } = await supabase.rpc("creator_analytics", { p_days: days });
      if (error) throw error;
      return (data as unknown as CreatorAnalytics) ?? null;
    },
  });
}

export interface RetentionPoint {
  bucket: number;
  pct_of_video: number;
  reached: number;
  reached_pct: number;
}

export function useUploadRetention(uploadId: string | null) {
  return useQuery({
    queryKey: ["creator-retention", uploadId],
    enabled: Boolean(uploadId),
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<{ plays: number; curve: RetentionPoint[] } | null> => {
      const { data, error } = await supabase.rpc("creator_upload_retention", {
        p_upload_id: uploadId as string,
      });
      if (error) throw error;
      return (data as unknown as { plays: number; curve: RetentionPoint[] }) ?? null;
    },
  });
}

// ---------------------------------------------------------------------------
// Moderation trail + appeals
// ---------------------------------------------------------------------------

export interface FlagReason {
  code: string;
  label: string;
  guidance: string;
  severity: "minor" | "major" | "critical";
  appealable: boolean;
}

export function useFlagReasons() {
  return useQuery({
    queryKey: ["creator-flag-reasons"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<FlagReason[]> => {
      const { data, error } = await supabase
        .from("creator_flag_reasons")
        .select("code,label,guidance,severity,appealable")
        .eq("active", true)
        .order("severity", { ascending: false })
        .order("label");
      if (error) throw error;
      return (data ?? []) as unknown as FlagReason[];
    },
  });
}

export interface ModerationTrail {
  upload: {
    id: string;
    title: string;
    status: string;
    visual_state: string;
    language: string;
    detected_language: string | null;
    language_confidence: number | null;
    flag_reason_code: string | null;
    moderation_reason: string | null;
    review_notes: string | null;
    reviewed_at: string | null;
    published_at: string | null;
    created_at: string;
  };
  reason: FlagReason | null;
  events: Array<{
    id: string;
    event: string;
    actor_kind: string;
    detail: Record<string, unknown>;
    created_at: string;
  }>;
  appeals: Array<{
    id: string;
    status: string;
    message: string;
    resolution_notes: string | null;
    created_at: string;
    resolved_at: string | null;
  }>;
}

export function useModerationTrail(uploadId: string | null) {
  return useQuery({
    queryKey: ["creator-moderation-trail", uploadId],
    enabled: Boolean(uploadId),
    retry: false,
    queryFn: async (): Promise<ModerationTrail | null> => {
      const { data, error } = await supabase.rpc("creator_moderation_trail", {
        p_upload_id: uploadId as string,
      });
      if (error) throw error;
      return (data as unknown as ModerationTrail) ?? null;
    },
  });
}

export function useSubmitAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { uploadId: string; message?: string }) => {
      const { data, error } = await supabase.rpc("submit_creator_appeal", {
        p_upload_id: vars.uploadId,
        p_message: vars.message ?? "",
      });
      if (error) throw error;
      return data as unknown as { ok: boolean; appeal_id: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["creator-uploads"] });
      void queryClient.invalidateQueries({ queryKey: ["creator-moderation-trail"] });
    },
  });
}

export function useResolveAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      appealId: string;
      decision: "upheld" | "declined" | "reviewing";
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("resolve_creator_appeal", {
        p_appeal_id: vars.appealId,
        p_decision: vars.decision,
        p_notes: vars.notes ?? null,
      });
      if (error) throw error;
      return data as unknown as { ok: boolean };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["creator-appeals-queue"] });
    },
  });
}

export function useAppealsQueue() {
  return useQuery({
    queryKey: ["creator-appeals-queue"],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_appeals")
        .select(
          "id,status,message,reason_code,created_at,resolution_notes,upload:creator_uploads(id,title,status,language),creator:creator_accounts(display_name,handle,strikes)",
        )
        .in("status", ["open", "reviewing"])
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Playback telemetry (feeds the analytics dashboard)
// ---------------------------------------------------------------------------

function sessionId(): string {
  try {
    const key = "heartify.session.id";
    let value = window.sessionStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      window.sessionStorage.setItem(key, value);
    }
    return value;
  } catch {
    return "anon";
  }
}

/**
 * Records one playback record per mounted video: watched seconds, furthest
 * position, whether it completed, and whether autoplay was allowed. Flushed on
 * unmount and on tab hide so mobile sessions are not lost.
 */
export function useUploadTelemetry(uploadId: string | undefined) {
  const { user } = useAuth();
  const state = useRef({
    watched: 0,
    position: 0,
    duration: 0,
    completed: false,
    autoplayOk: null as boolean | null,
    flushed: false,
    counted: false,
  });

  const flush = useCallback(async () => {
    const s = state.current;
    if (!uploadId || s.flushed || s.watched < 2) return;
    s.flushed = true;
    await supabase.from("creator_watch_events").insert({
      upload_id: uploadId,
      user_id: user?.id ?? null,
      session_id: sessionId(),
      watched_seconds: Math.round(s.watched),
      position_seconds: Math.round(s.position),
      duration_seconds: s.duration ? Math.round(s.duration) : null,
      completed: s.completed,
      autoplay_ok: s.autoplayOk,
    });
  }, [uploadId, user?.id]);

  useEffect(() => {
    state.current = {
      watched: 0,
      position: 0,
      duration: 0,
      completed: false,
      autoplayOk: null,
      flushed: false,
      counted: false,
    };
  }, [uploadId]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  const onTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      const s = state.current;
      const delta = currentTime - s.position;
      if (delta > 0 && delta < 2) s.watched += delta;
      s.position = Math.max(s.position, currentTime);
      if (duration) s.duration = duration;
      if (duration && currentTime / duration > 0.9) s.completed = true;
      // A single view is counted once real playback happens.
      if (!s.counted && s.watched > 3 && uploadId) {
        s.counted = true;
        void supabase.rpc("bump_creator_upload_view", { p_upload_id: uploadId });
      }
    },
    [uploadId],
  );

  const onAutoplayResult = useCallback((ok: boolean) => {
    state.current.autoplayOk = ok;
  }, []);

  return { onTimeUpdate, onAutoplayResult, flush };
}
