import { useCallback, useEffect, useState } from "react";
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

export function useStreak() {
  const { user } = useAuth();
  const [state, setState] = useState<StreakState>({
    current: 0,
    longest: 0,
    lastCompletedDate: null,
    total: 0,
    freezes: 0,
    milestones: [],
    nextMilestone: 3,
  });
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: streak }, { data: freezes }, { data: milestones }] = await Promise.all([
      supabase.from("streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("streak_freezes").select("id").eq("user_id", user.id).is("used_at", null),
      supabase.from("streak_milestones").select("milestone").eq("user_id", user.id),
    ]);
    const current = streak?.current_streak ?? 0;
    setState({
      current,
      longest: streak?.longest_streak ?? 0,
      lastCompletedDate: streak?.last_completed_date ?? null,
      total: streak?.total_doses_completed ?? 0,
      freezes: freezes?.length ?? 0,
      milestones: (milestones ?? []).map((m) => m.milestone).sort((a, b) => a - b),
      nextMilestone: nextMilestoneAfter(current),
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const recordActivity = useCallback(async () => {
    if (!user || recording) return null;
    setRecording(true);
    try {
      const { data, error } = await supabase.rpc("record_streak_activity");
      if (error) throw error;
      await track("streak_activity_recorded", data as Record<string, unknown>);
      await load();
      return data;
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[streak] record failed", err);
      return null;
    } finally {
      setRecording(false);
    }
  }, [user, recording, load]);

  return { ...state, loading, recording, refresh: load, recordActivity };
}
