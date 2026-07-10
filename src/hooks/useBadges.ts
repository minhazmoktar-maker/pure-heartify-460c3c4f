import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BadgeCatalogEntry {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface EarnedBadge extends BadgeCatalogEntry {
  earned_at: string;
}

export function useBadges() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<BadgeCatalogEntry[]>([]);
  const [earned, setEarned] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: cat } = await supabase
        .from("badges")
        .select("key,name,description,icon,category")
        .order("category");
      if (!mounted) return;
      setCatalog((cat ?? []) as BadgeCatalogEntry[]);

      if (!user) {
        setEarned([]);
        setLoading(false);
        return;
      }
      const { data: mine } = await supabase
        .from("user_badges")
        .select("badge_key,earned_at,badges(key,name,description,icon,category)")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      if (!mounted) return;
      setEarned(
        (mine ?? []).map((row) => {
          const b = (row as { badges: BadgeCatalogEntry }).badges;
          return { ...b, earned_at: (row as { earned_at: string }).earned_at };
        }),
      );
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  return { catalog, earned, loading };
}
