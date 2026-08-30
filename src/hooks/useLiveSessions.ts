import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LiveKind = "study_circle" | "qa" | "watch_party";

export interface LiveSessionSummary {
  id: string;
  kind: LiveKind;
  title: string;
  description: string | null;
  video_id: string | null;
  language: string;
  status: string;
  scheduled_at: string;
  participant_count: number;
  max_participants: number;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  is_joined: boolean;
}

export interface LiveMessage {
  id: string;
  session_id: string;
  user_id: string;
  body: string;
  is_question: boolean;
  created_at: string;
}

export function useLiveSessions(kind?: LiveKind) {
  return useQuery({
    queryKey: ["live-sessions", kind ?? "all"],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<LiveSessionSummary[]> => {
      const { data, error } = await supabase.rpc("list_live_sessions", {
        _kind: kind ?? null,
        _limit: 40,
      });
      if (error) throw error;
      return (data ?? []) as LiveSessionSummary[];
    },
  });
}

export function useLiveSession(id: string | undefined) {
  return useQuery({
    queryKey: ["live-session", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select(
          "id, kind, title, description, video_id, language, status, scheduled_at, participant_count, max_participants, host_id",
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Whether the signed-in user has joined this session (rosters are member-only). */
export function useIsLiveSessionMember(id: string | undefined) {
  return useQuery({
    queryKey: ["live-session-member", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<boolean> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return false;
      const { data, error } = await supabase
        .from("live_session_participants")
        .select("session_id")
        .eq("session_id", id!)
        .eq("user_id", uid)
        .maybeSingle();
      if (error) return false;
      return Boolean(data);
    },
  });
}

export function useJoinLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc("join_live_session", {
        _session_id: sessionId,
      });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string };
      if (!res?.ok) throw new Error(res?.error ?? "join_failed");
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
      qc.invalidateQueries({ queryKey: ["live-session-member"] });
      qc.invalidateQueries({ queryKey: ["live-messages"] });
    },
  });
}

export function useLeaveLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.rpc("leave_live_session", {
        _session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
      qc.invalidateQueries({ queryKey: ["live-session-member"] });
      qc.invalidateQueries({ queryKey: ["live-messages"] });
    },
  });
}

export function useCreateLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      title: string;
      kind: LiveKind;
      description?: string;
      scheduledAt: string;
      videoId?: string | null;
      language?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("auth required");
      const { data, error } = await supabase
        .from("live_sessions")
        .insert({
          host_id: uid,
          title: vars.title,
          kind: vars.kind,
          description: vars.description ?? null,
          scheduled_at: vars.scheduledAt,
          video_id: vars.videoId ?? null,
          language: vars.language ?? "en",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live-sessions"] }),
  });
}

/** Session chat: initial fetch plus realtime inserts. */
export function useLiveMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["live-messages", sessionId],
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<LiveMessage[]> => {
      const { data, error } = await supabase
        .from("live_session_messages")
        .select("id, session_id, user_id, body, is_question, created_at")
        .eq("session_id", sessionId!)
        .eq("is_hidden", false)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LiveMessage[];
    },
  });
}

export function useSendLiveMessage(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { body: string; isQuestion?: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid || !sessionId) throw new Error("auth required");
      const { error } = await supabase.from("live_session_messages").insert({
        session_id: sessionId,
        user_id: uid,
        body: vars.body.trim().slice(0, 1000),
        is_question: vars.isQuestion ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live-messages", sessionId] }),
  });
}
