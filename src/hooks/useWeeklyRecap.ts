import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WeeklyRecap {
  week_start: string;
  minutes_watched: number;
  favorites_added: number;
  dhikr_count: number;
  juz_completed: number;
  streak_length: number;
}

function startOfWeekISO(d = new Date()): string {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function useWeeklyRecap() {
  const { user } = useAuth();
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const week = startOfWeekISO();
    // Recompute (idempotent) and fetch in one round-trip.
    const { data, error } = await supabase.rpc("compute_weekly_recap", {
      _user_id: user.id,
      _week_start: week,
    });
    if (error) {
      setLoading(false);
      return;
    }
    setRecap((data as WeeklyRecap | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { recap, loading, refresh: load };
}
