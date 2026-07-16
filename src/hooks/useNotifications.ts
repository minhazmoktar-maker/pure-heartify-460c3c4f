import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/**
 * Server-driven in-app notifications backed by `public.user_notifications`.
 * Subscribes to postgres_changes so new rows appear in real time.
 *
 * Perf: switched to React Query so the notifications bell (mounted on every
 * page) no longer refetches on each navigation. The realtime channel
 * invalidates the cache instead — cutting a GET on every route change.
 */
export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["user-notifications", user?.id ?? "anon"] as const;

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<AppNotification[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_notifications")
        .select("id,kind,title,body,data,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as AppNotification[];
    },
  });

  const items = query.data ?? [];

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`user_notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => { void qc.invalidateQueries({ queryKey: key }); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setItems = useCallback(
    (updater: (prev: AppNotification[]) => AppNotification[]) => {
      qc.setQueryData<AppNotification[]>(key, (prev) => updater(prev ?? []));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc, user?.id],
  );

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
  }, [user, setItems]);

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from("user_notifications").update({ read_at: now }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
  }, [setItems]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("user_notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, [setItems]);

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: key });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, user?.id]);

  return { items, unread, loading: query.isLoading, markAllRead, markRead, remove, refresh };
}
