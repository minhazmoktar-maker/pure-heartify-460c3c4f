import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TeamStreak {
  id: string;
  name: string;
  invite_code: string;
  current_streak: number;
  longest_streak: number;
  last_all_completed_date: string | null;
  member_count: number;
  member_limit: number;
  completed_today_count: number;
  i_completed_today: boolean;
  is_creator: boolean;
}

export function useTeamStreaks() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamStreak[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setTeams([]);
      return;
    }
    setLoading(true);
    setError(null);
    // settle first so today's advance is reflected
    try { await supabase.rpc("settle_team_streaks"); } catch { /* noop */ }
    const { data, error } = await supabase.rpc("list_my_team_streaks");
    if (error) setError(error.message);
    setTeams((data ?? []) as TeamStreak[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (name: string) => {
      const { data, error } = await supabase.rpc("create_team_streak", { _name: name });
      if (error) throw error;
      await load();
      return data;
    },
    [load],
  );

  const join = useCallback(
    async (code: string) => {
      const { data, error } = await supabase.rpc("join_team_streak", { _code: code });
      if (error) throw error;
      await load();
      return data;
    },
    [load],
  );

  const leave = useCallback(
    async (teamId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("team_streak_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id);
      if (error) throw error;
      await load();
    },
    [load, user],
  );

  return { teams, loading, error, reload: load, create, join, leave };
}
