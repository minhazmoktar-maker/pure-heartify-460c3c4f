import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shared cache for the current user's public handle. Perf: previously every
 * component that needed it (StreakCard, WeeklyRecapCard, Achievements,
 * HandleClaimCard) fired its own `profiles?select=handle` GET on every mount
 * and every route change. React Query gives all of them a single 15-minute
 * cached read.
 */
export function useMyHandle() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-handle", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 15 * 60 * 1000,
    queryFn: async (): Promise<{ handle: string | null; displayName: string | null }> => {
      if (!user) return { handle: null, displayName: null };
      const { data } = await supabase
        .from("profiles")
        .select("handle,display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      return {
        handle: (data?.handle as string | null) ?? null,
        displayName: (data?.display_name as string | null) ?? null,
      };
    },
  });
  return {
    handle: q.data?.handle ?? null,
    displayName: q.data?.displayName ?? null,
    loading: q.isLoading,
  };
}
