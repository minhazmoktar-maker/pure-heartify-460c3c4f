import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DoseVideo {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  section_id: string | null;
  halal_score: number | null;
  category: string | null;
}

export interface DailyDoseData {
  dose: {
    id: string;
    dose_date: string;
    video_ids: string[];
    total_minutes: number;
    completed_count: number;
    completed_at: string | null;
  };
  videos: DoseVideo[];
  completedVideoIds: string[];
  streak: {
    current_streak: number;
    longest_streak: number;
    last_completed_date: string | null;
    total_doses_completed: number;
  };
}

export function useDailyDose() {
  const { user } = useAuth();

  return useQuery<DailyDoseData>({
    queryKey: ["daily-dose", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      // Grab whatever token we currently have. Do NOT proactively call
      // getUser()/refreshSession() here — a transient network blip would
      // otherwise cascade into a forced sign-out. Supabase's auth client
      // already auto-refreshes tokens in the background.
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const { data, error } = await supabase.functions.invoke("generate-daily-dose", {
        body: {},
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw new Error(error.message);
      return data as DailyDoseData;
    },
  });
}

export interface CompleteResult {
  ok: boolean;
  inDose: boolean;
  completedCount?: number;
  total?: number;
  justCompleted?: boolean;
  milestone?: number | null;
  streak?: any;
}

export function useCompleteDoseVideo() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation<CompleteResult, Error, string>({
    mutationFn: async (videoId: string) => {
      const { data, error } = await supabase.functions.invoke("complete-dose-video", {
        body: { videoId },
      });
      if (error) throw new Error(error.message);
      return data as CompleteResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-dose", user?.id] });
      // Dose completions feed verified social progress: refresh the viewer's own
      // summary plus the circle / challenge / leaderboard reads that derive from
      // it. Friends' dashboards update server-side, gated by their privacy
      // settings — nothing extra is shared from here.
      qc.invalidateQueries({ queryKey: ["my-progress"] });
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["challenges"] });
      qc.invalidateQueries({ queryKey: ["friends-leaderboard"] });

    },
  });
}
