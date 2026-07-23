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
      // Ensure we have a live session token before hitting the auth-gated function.
      let { data: sess } = await supabase.auth.getSession();
      let token = sess.session?.access_token;

      // Verify the token is still valid server-side; a stale/revoked session
      // returns 403 session_not_found and the edge function then rejects as 401.
      const { error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        const { data: refreshed, error: refreshErr } =
          await supabase.auth.refreshSession();
        if (refreshErr || !refreshed.session) {
          await supabase.auth.signOut();
          throw new Error("Session expired. Please sign in again.");
        }
        token = refreshed.session.access_token;
      }

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
    },
  });
}
