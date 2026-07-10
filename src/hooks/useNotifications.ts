import { useEffect, useState, useCallback } from "react";
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
 */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_notifications")
      .select("id,kind,title,body,data,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
    const ch = supabase
      .channel(`user_notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, load]);

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
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from("user_notifications").update({ read_at: now }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from("user_notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { items, unread, loading, markAllRead, markRead, remove, refresh: load };
}
