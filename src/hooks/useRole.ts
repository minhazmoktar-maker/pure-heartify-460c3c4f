import { useEffect, useState } from "react";
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
 */
export function useRole(): RoleState {
  const { user } = useAuth();
  const [tier, setTier] = useState<RoleTier>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setTier("user");
          setLoading(false);
        }
        return;
      }
      setLoading(true);

      // Owner check via platform_owners (RLS-protected; only owner sees rows).
      const { data: ownerRow } = await supabase
        .from("platform_owners" as never)
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownerRow) {
        if (!cancelled) {
          setTier("owner");
          setLoading(false);
        }
        return;
      }

      const { data: adminRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!cancelled) {
        setTier(adminRow ? "admin" : "user");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const rank = RANK[tier];
  return {
    loading,
    tier,
    isOwner: tier === "owner",
    isAdmin: rank >= RANK.admin,
    isModerator: rank >= RANK.moderator,
    hasMinRole: (min: RoleTier) => rank >= RANK[min],
  };
}
