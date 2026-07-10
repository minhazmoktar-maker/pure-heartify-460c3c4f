import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardMetric = "streak" | "khatm_juz" | "dhikr" | "minutes";
export type LeaderboardPeriod = "daily" | "weekly" | "all_time";
export type LeaderboardScope = "global" | "group";

export interface LeaderboardRow {
  user_id: string;
  display_name: string | null;
  score: number;
  rank: number;
}

interface Options {
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  groupId?: string | null;
  limit?: number;
}

export function useLeaderboard({ scope, metric, period, groupId, limit = 25 }: Options) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [computedAt, setComputedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("leaderboard_snapshots")
      .select("user_id,display_name,score,rank,computed_at")
      .eq("scope", scope)
      .eq("metric", metric)
      .eq("period", period)
      .order("rank", { ascending: true })
      .limit(limit);
    if (scope === "group" && groupId) q = q.eq("group_id", groupId);
    const { data } = await q;
    const list = (data ?? []) as (LeaderboardRow & { computed_at: string })[];
    setRows(list);
    setComputedAt(list[0]?.computed_at ?? null);
    setLoading(false);
  }, [scope, metric, period, groupId, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, computedAt, refresh: load };
}
