import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

/**
 * React Query-backed weekly recap. Perf: the compute_weekly_recap RPC is
 * idempotent but non-trivial — the previous useEffect implementation fired it
 * on every mount, meaning each route change re-ran the recomputation. Caching
 * per user+week eliminates that redundant work entirely between navigations.
 */
export function useWeeklyRecap() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const week = startOfWeekISO();

  const query = useQuery({
    queryKey: ["weekly-recap", user?.id ?? "anon", week],
    enabled: !!user,
    queryFn: async (): Promise<WeeklyRecap | null> => {
      if (!user) return null;
      const { data, error } = await supabase.rpc("compute_weekly_recap", {
        _user_id: user.id,
        _week_start: week,
      });
      if (error) return null;
      return (data as WeeklyRecap | null) ?? null;
    },
    // Recap only changes on activity; keep it fresh for the whole week bucket
    // — invalidation on activity is handled by the streak hook's refresh.
    staleTime: 15 * 60 * 1000,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["weekly-recap", user?.id ?? "anon", week] });
  }, [qc, user?.id, week]);

  return { recap: query.data ?? null, loading: query.isLoading, refresh };
}
