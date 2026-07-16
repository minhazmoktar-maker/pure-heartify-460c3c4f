import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RoleTier = "user" | "moderator" | "admin" | "owner";

const RANK: Record<RoleTier, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

interface RoleState {
  loading: boolean;
  tier: RoleTier;
  isOwner: boolean;
  isAdmin: boolean; // includes owner
  isModerator: boolean; // includes admin & owner
  hasMinRole: (min: RoleTier) => boolean;
}

/**
 * Central RBAC hook. Owner > Admin > Moderator > User.
 * Backend RLS is the source of truth — this hook only drives UI visibility.
 *
 * Perf: previously fired 1-2 sequential Supabase queries on every mount of
 * every gated widget (Navbar, admin routes, moderation surfaces). React Query
 * with a long staleTime dedupes across mounts and eliminates the repeated
 * platform_owners / user_roles round-trips visible in production traces.
 */
export function useRole(): RoleState {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["role", user?.id ?? "anon"],
    enabled: !!user,
    // Roles change extremely rarely; a 15-min cache is plenty.
    staleTime: 15 * 60 * 1000,
    queryFn: async (): Promise<RoleTier> => {
      if (!user) return "user";
      // Owner check via platform_owners (RLS-protected; only owner sees rows).
      const { data: ownerRow } = await supabase
        .from("platform_owners" as never)
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ownerRow) return "owner";

      const { data: adminRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      return adminRow ? "admin" : "user";
    },
  });

  const tier: RoleTier = query.data ?? "user";
  const rank = RANK[tier];
  return {
    loading: query.isLoading,
    tier,
    isOwner: tier === "owner",
    isAdmin: rank >= RANK.admin,
    isModerator: rank >= RANK.moderator,
    hasMinRole: (min: RoleTier) => rank >= RANK[min],
  };
}
