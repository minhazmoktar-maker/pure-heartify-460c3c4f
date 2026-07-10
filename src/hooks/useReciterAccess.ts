import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEntitlement } from "./useEntitlement";

/**
 * Client-side hint for whether the current viewer can play a given reciter's
 * premium audio. UI-only — server-side gates in feed/search/recommendations and
 * the `reciter_is_accessible` RPC remain the source of truth.
 */
export function useReciterAccess(reciterId: string | null | undefined) {
  const { isPremium } = useEntitlement();
  const [accessible, setAccessible] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(Boolean(reciterId));

  useEffect(() => {
    let cancelled = false;
    if (!reciterId) {
      setAccessible(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("reciters")
        .select("is_premium, min_plan")
        .eq("id", reciterId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setAccessible(true);
        setLoading(false);
        return;
      }
      const gated = data.is_premium && data.min_plan !== "free";
      setAccessible(!gated || isPremium);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reciterId, isPremium]);

  return { accessible, loading };
}
