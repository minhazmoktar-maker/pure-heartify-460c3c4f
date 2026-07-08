import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Entitlement {
  plan: string;              // 'free' | 'premium' | future tiers
  expiresAt: string | null;  // ISO
  features: Record<string, unknown>;
  isPremium: boolean;        // plan != 'free' AND not expired
}

const FREE: Entitlement = { plan: "free", expiresAt: null, features: {}, isPremium: false };

/**
 * Reads the caller's row from `public.entitlements`. Values are the single
 * source of truth for premium gating in the UI. Backend edge functions also
 * re-check `has_active_premium(user_id)` so a compromised client cannot
 * upgrade itself.
 */
export function useEntitlement() {
  const { user, loading: authLoading } = useAuth();
  const [entitlement, setEntitlement] = useState<Entitlement>(FREE);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    if (!user) { setEntitlement(FREE); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("entitlements")
      .select("plan, expires_at, features")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) { setEntitlement(FREE); setLoading(false); return; }
    const notExpired = !data.expires_at || new Date(data.expires_at).getTime() > Date.now();
    setEntitlement({
      plan: data.plan ?? "free",
      expiresAt: data.expires_at,
      features: (data.features as Record<string, unknown>) ?? {},
      isPremium: data.plan !== "free" && notExpired,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  // Realtime — react instantly when an admin grants/revokes the caller.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`entitlements:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entitlements", filter: `user_id=eq.${user.id}` },
        () => { void refresh(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, refresh]);

  return { entitlement, isPremium: entitlement.isPremium, loading, refresh };
}
