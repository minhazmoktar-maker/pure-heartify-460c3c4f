/**
 * useReturnDigest — the "Since you were away" return-value loop.
 *
 * Reads the `return_digest` RPC, which is deliberately honest: it only
 * returns rows that genuinely changed since the user's last watch
 * (unfinished videos to resume, new uploads from followed creators,
 * fresh high-trust gems in their content languages). When nothing
 * changed it returns an empty list and the UI renders nothing — we never
 * manufacture activity to pull people back.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ReturnDigestKind = "resume" | "follow_upload" | "fresh_gem";

export interface ReturnDigestItem {
  video_id: string;
  title: string;
  channel_title: string | null;
  thumbnail_url: string | null;
  category: string | null;
  kind: ReturnDigestKind;
  reason: string;
  progress_seconds: number | null;
}

export interface ReturnDigest {
  items: ReturnDigestItem[];
  last_seen: string | null;
  away_hours: number | null;
}

const EMPTY: ReturnDigest = { items: [], last_seen: null, away_hours: null };

export function useReturnDigest(limit = 6) {
  const { user } = useAuth();
  return useQuery<ReturnDigest>({
    queryKey: ["return-digest", user?.id ?? "anon", limit],
    enabled: !!user,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("return_digest", { p_limit: limit });
      if (error) throw error;
      const payload = (data ?? EMPTY) as unknown as ReturnDigest;
      return {
        items: Array.isArray(payload.items) ? payload.items : [],
        last_seen: payload.last_seen ?? null,
        away_hours: payload.away_hours ?? null,
      };
    },
  });
}
