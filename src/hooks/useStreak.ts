import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";

export interface StreakState {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
  total: number;
  freezes: number;
  milestones: number[];
  nextMilestone: number | null;
}

const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365, 500, 1000];

function nextMilestoneAfter(n: number): number | null {
  return MILESTONES.find((m) => m > n) ?? null;
}

const EMPTY: StreakState = {
  current: 0,
  longest: 0,
  lastCompletedDate: null,
  total: 0,
  freezes: 0,
  milestones: [],
  nextMilestone: 3,
};

/**
 * React Query-backed streak hook. Perf: multiple consumers (StreakCard,
 * StreakAtRiskBanner, Achievements page) share one cached result, and
 * nav-driven remounts no longer refire 3 parallel queries — a 5-minute
 * staleTime honors the app-wide default and typically eliminates every
 * duplicate request seen between route transitions.
 */
export function useStreak() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);

  const query = useQuery({
    queryKey: ["streak", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async (): Promise<StreakState> => {
      if (!user) return EMPTY;
      const [{ data: streak }, { data: freezes }, { data: milestones }] = await Promise.all([
        supabase.from("streaks").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("streak_freezes").select("id").eq("user_id", user.id).is("used_at", null),
        supabase.from("streak_milestones").select("milestone").eq("user_id", user.id),
      ]);
      const current = streak?.current_streak ?? 0;
      return {
        current,
        longest: streak?.longest_streak ?? 0,
        lastCompletedDate: streak?.last_completed_date ?? null,
        total: streak?.total_doses_completed ?? 0,
        freezes: freezes?.length ?? 0,
        milestones: (milestones ?? []).map((m) => m.milestone).sort((a, b) => a - b),
        nextMilestone: nextMilestoneAfter(current),
      };
    },
  });

  const state = query.data ?? EMPTY;

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["streak", user?.id ?? "anon"] });
  }, [qc, user?.id]);

  const recordActivity = useCallback(async () => {
    if (!user || recording) return null;
    setRecording(true);
    try {
      // Use the user's LOCAL date so timezones offset from UTC don't skip a
      // calendar day and reset the streak. RPC clamps to ±1 UTC day.
      const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      const { data, error } = await supabase.rpc("record_streak_activity", { _client_date: localDate });
      if (error) throw error;
      const payload = (data ?? {}) as {
        milestone_hit?: number | null;
        freeze_granted?: boolean;
        freeze_used?: boolean;
        next_freeze_at?: string | null;
        current?: number;
      } & Record<string, unknown>;
      await track("streak_activity_recorded", payload);
      if (payload.milestone_hit && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("heartify:streak-milestone", {
            detail: {
              milestone: payload.milestone_hit,
              freezeGranted: !!payload.freeze_granted,
            },
          }),
        );
      }
      if (payload.freeze_used && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("heartify:streak-freeze-used", {
            detail: { current: payload.current ?? 0 },
          }),
        );
      }
      await refresh();
      return data;
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[streak] record failed", err);
      return null;
    } finally {
      setRecording(false);
    }
  }, [user, recording, refresh]);

  return { ...state, loading: query.isLoading, recording, refresh, recordActivity };
}
