import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklyDigest {
  since: string;
  videos_watched: number;
  minutes_watched: number;
  prev_minutes_watched: number;
  videos_completed: number;
  doses_completed: number;
  current_streak: number;
  longest_streak: number;
  concepts_learned: { title: string; domain: string }[];
}

/** "What you learned this week" — closes the habit loop with visible benefit. */
export function useWeeklyDigest(enabled = true) {
  return useQuery({
    queryKey: ["weekly-digest"],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<WeeklyDigest> => {
      const { data, error } = await supabase.rpc("my_weekly_digest");
      if (error) throw error;
      return data as unknown as WeeklyDigest;
    },
  });
}

export interface LearningCertificate {
  code: string;
  path_id: string;
  path_title: string;
  path_slug: string;
  concepts_completed: number;
  issued_at: string;
}

export function useMyCertificates(enabled = true) {
  return useQuery({
    queryKey: ["my-certificates"],
    enabled,
    queryFn: async (): Promise<LearningCertificate[]> => {
      const { data, error } = await supabase.rpc("my_learning_certificates");
      if (error) throw error;
      return (data ?? []) as LearningCertificate[];
    },
  });
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pathSlug: string) => {
      const { data, error } = await supabase.rpc("issue_learning_certificate_by_slug", {
        _slug: pathSlug,
      });
      if (error) throw error;
      const res = data as { ok: boolean; code?: string; error?: string };
      if (!res?.ok) throw new Error(res?.error ?? "issue_failed");
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-certificates"] }),
  });
}

export function useVerifyCertificate(code: string | undefined) {
  return useQuery({
    queryKey: ["verify-certificate", code],
    enabled: Boolean(code),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_certificate", { _code: code! });
      if (error) throw error;
      const rows = (data ?? []) as {
        code: string;
        recipient_name: string | null;
        path_title: string;
        concepts_completed: number;
        issued_at: string;
      }[];
      return rows[0] ?? null;
    },
  });
}
