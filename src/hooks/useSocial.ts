import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

/**
 * Heartify Connections & Accountability — client data layer.
 *
 * Every read/write goes through SECURITY DEFINER RPCs so that:
 *  - progress is computed server-side from real activity (never client-submitted)
 *  - privacy visibility + blocks are enforced in one place
 *  - rate limits and duplicate prevention live on the server
 */

export type ConnectionStatus = "none" | "outgoing" | "incoming" | "connected" | "declined";

export interface UserSearchResult {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  primary_interest: string | null;
  current_streak: number | null;
  connection_status: ConnectionStatus;
  connection_id: string | null;
}

export interface ConnectionRow {
  connection_id: string;
  user_handle: string;
  display_name: string | null;
  avatar_url: string | null;
  current_streak: number | null;
  week_minutes: number | null;
  week_doses: number | null;
  week_videos: number | null;
  progress_shared: boolean;
  connected_at: string | null;
}

export interface RequestRow {
  connection_id: string;
  direction: "incoming" | "outgoing";
  user_handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface ChallengeMember {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  is_me: boolean;
  state: string;
  progress: number;
  completed: boolean;
}

export interface Challenge {
  id: string;
  type: "minutes" | "doses" | "videos" | "sessions";
  title: string;
  description: string | null;
  goal: number;
  start_at: string;
  end_at: string;
  status: string;
  is_creator: boolean;
  my_state: string;
  members: ChallengeMember[];
}

export interface ProgressSummary {
  today: { minutes: number; videos: number; doses: number };
  week: { minutes: number; videos: number; doses: number; days: number };
  current_streak: number;
  longest_streak: number;
}

type RpcResult = { ok?: boolean; error?: string } | null;

const ERRORS: Record<string, string> = {
  unauthenticated: "Please sign in first.",
  handle_not_found: "No Heartify member with that username.",
  cannot_connect_self: "You can't connect with yourself.",
  blocked: "This member can't be reached.",
  already_connected: "You're already connected.",
  request_pending: "A request is already pending.",
  daily_limit_reached: "You've reached today's limit — try again tomorrow.",
  not_pending: "This request was already answered.",
  forbidden: "You can't do that.",
  not_found: "Not found.",
  not_invited: "You weren't invited to this challenge.",
  already_responded: "You already answered this invite.",
  invalid_type: "Pick a valid challenge type.",
  invalid_duration: "Pick a valid duration.",
  invalid_goal: "Pick a realistic goal.",
  invalid_title: "Give your challenge a title.",
  too_many_invites: "You can invite up to 20 connections.",
  too_many_active_challenges: "You already have 10 active challenges.",
  cannot_report_self: "You can't report yourself.",
  cannot_block_self: "You can't block yourself.",
  description_too_long: "Please shorten your description.",
  invalid_reason: "Pick a reason.",
  private: "This member keeps their progress private.",
};

export const explainSocialError = (code?: string | null) =>
  (code && ERRORS[code]) || "Something went wrong. Please try again.";

/** My verified progress (today / this week / streak). */
export function useMyProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-progress", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<ProgressSummary | null> => {
      const { data, error } = await supabase.rpc("my_progress_summary");
      if (error) throw error;
      const payload = data as unknown as ProgressSummary & { error?: string };
      if (!payload || payload.error) return null;
      return payload;
    },
  });
}

/** Debounced member search for "Find friends". */
export function useUserSearch(query: string) {
  const { user } = useAuth();
  const q = query.trim();
  return useQuery({
    queryKey: ["user-search", q, user?.id ?? "anon"],
    enabled: !!user && q.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<UserSearchResult[]> => {
      const { data, error } = await supabase.rpc("search_heartify_users", { _q: q, _limit: 20 });
      if (error) throw error;
      return (data ?? []) as UserSearchResult[];
    },
  });
}

export function useConnections() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["connections"] });
    void qc.invalidateQueries({ queryKey: ["connection-requests"] });
    void qc.invalidateQueries({ queryKey: ["user-search"] });
    void qc.invalidateQueries({ queryKey: ["friends-leaderboard"] });
  }, [qc]);

  const connections = useQuery({
    queryKey: ["connections", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<ConnectionRow[]> => {
      const { data, error } = await supabase.rpc("list_my_connections");
      if (error) throw error;
      return (data ?? []) as ConnectionRow[];
    },
  });

  const requests = useQuery({
    queryKey: ["connection-requests", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async (): Promise<RequestRow[]> => {
      const { data, error } = await supabase.rpc("list_my_connection_requests");
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
  });

  const call = async (fn: () => Promise<{ data: unknown; error: unknown }>) => {
    const { data, error } = await fn();
    const payload = (data ?? {}) as NonNullable<RpcResult>;
    if (error || payload?.error) throw new Error(explainSocialError(payload?.error));
    return payload;
  };

  const sendRequest = useMutation({
    mutationFn: (handle: string) =>
      call(() => supabase.rpc("send_connection_request", { _handle: handle }) as never),
    onSuccess: (_d, handle) => {
      void track("connection.request_sent", { handle });
      toast({ title: "Request sent", description: `@${handle} will see your request.` });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Couldn't send", description: e.message, variant: "destructive" }),
  });

  const respond = useMutation({
    mutationFn: (vars: { id: string; accept: boolean }) =>
      call(() =>
        supabase.rpc("respond_connection_request", {
          _connection_id: vars.id,
          _accept: vars.accept,
        }) as never,
      ),
    onSuccess: (_d, vars) => {
      void track(vars.accept ? "connection.accepted" : "connection.declined", {});
      toast({ title: vars.accept ? "Connected 🌿" : "Request declined" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase.from("user_connections").delete().eq("id", connectionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Connection removed" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Couldn't remove", description: e.message, variant: "destructive" }),
  });

  const blockUser = useMutation({
    mutationFn: (handle: string) =>
      call(() => supabase.rpc("block_heartify_user", { _handle: handle }) as never),
    onSuccess: (_d, handle) => {
      toast({ title: "Member blocked", description: `@${handle} can no longer reach you.` });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Couldn't block", description: e.message, variant: "destructive" }),
  });

  const reportUser = useMutation({
    mutationFn: (vars: { handle: string; reason: string; description?: string }) =>
      call(() =>
        supabase.rpc("report_heartify_user", {
          _handle: vars.handle,
          _reason: vars.reason,
          _description: vars.description ?? null,
        }) as never,
      ),
    onSuccess: () => toast({ title: "Report received", description: "Our moderation team will review it." }),
    onError: (e: Error) => toast({ title: "Couldn't report", description: e.message, variant: "destructive" }),
  });

  const incoming = useMemo(
    () => (requests.data ?? []).filter((r) => r.direction === "incoming"),
    [requests.data],
  );
  const outgoing = useMemo(
    () => (requests.data ?? []).filter((r) => r.direction === "outgoing"),
    [requests.data],
  );

  return {
    connections: connections.data ?? [],
    loadingConnections: connections.isLoading,
    connectionsError: connections.isError,
    refetchConnections: connections.refetch,
    incoming,
    outgoing,
    loadingRequests: requests.isLoading,
    requestsError: requests.isError,
    refetchRequests: requests.refetch,
    sendRequest,
    respond,
    remove,
    blockUser,
    reportUser,
  };
}


export function useChallenges() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["challenges", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<Challenge[]> => {
      const { data, error } = await supabase.rpc("list_my_challenges");
      if (error) throw error;
      return (data ?? []) as unknown as Challenge[];
    },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["challenges"] });

  const call = async (fn: () => Promise<{ data: unknown; error: unknown }>) => {
    const { data, error } = await fn();
    const payload = (data ?? {}) as NonNullable<RpcResult>;
    if (error || payload?.error) throw new Error(explainSocialError(payload?.error));
    return payload;
  };

  const create = useMutation({
    mutationFn: (vars: {
      type: Challenge["type"];
      title: string;
      goal: number;
      days: number;
      handles: string[];
      description?: string;
    }) =>
      call(() =>
        supabase.rpc("create_challenge", {
          _type: vars.type,
          _title: vars.title,
          _goal: vars.goal,
          _days: vars.days,
          _handles: vars.handles,
          _description: vars.description ?? null,
        }) as never,
      ),
    onSuccess: (_d, vars) => {
      void track("challenge.created", { type: vars.type, days: vars.days, invited: vars.handles.length });
      toast({ title: "Challenge created 🌿", description: "Your connections have been invited." });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Couldn't create", description: e.message, variant: "destructive" }),
  });

  const respond = useMutation({
    mutationFn: (vars: { id: string; accept: boolean }) =>
      call(() =>
        supabase.rpc("respond_challenge_invite", {
          _challenge_id: vars.id,
          _accept: vars.accept,
        }) as never,
      ),
    onSuccess: (_d, vars) => {
      void track(vars.accept ? "challenge.joined" : "challenge.declined", {});
      toast({ title: vars.accept ? "You're in 🌿" : "Invite declined" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });

  const leave = useMutation({
    mutationFn: (id: string) => call(() => supabase.rpc("leave_challenge", { _challenge_id: id }) as never),
    onSuccess: () => {
      toast({ title: "Left the challenge" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Couldn't leave", description: e.message, variant: "destructive" }),
  });

  const challenges = list.data ?? [];
  const invites = challenges.filter((c) => c.my_state === "invited");
  const active = challenges.filter((c) => c.my_state === "joined" && new Date(c.end_at) > new Date());
  const finished = challenges.filter((c) => c.my_state === "joined" && new Date(c.end_at) <= new Date());

  return {
    challenges,
    invites,
    active,
    finished,
    loading: list.isLoading,
    error: list.isError,
    refetch: list.refetch,
    create,
    respond,
    leave,
  };

}

export function useFriendsLeaderboard(metric: "minutes" | "doses" | "days" | "streak") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friends-leaderboard", metric, user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("friends_leaderboard", { _metric: metric });
      if (error) throw error;
      return (data ?? []) as {
        user_handle: string;
        display_name: string | null;
        avatar_url: string | null;
        is_me: boolean;
        score: number;
      }[];
    },
  });
}

/** Simple debounce for the search box. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
