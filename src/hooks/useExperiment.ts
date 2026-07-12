import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ANON_KEY_STORAGE = "heartify.anon_experiment_key";

function getAnonKey(): string {
  if (typeof window === "undefined") return "ssr";
  let k = localStorage.getItem(ANON_KEY_STORAGE);
  if (!k) {
    k = crypto.randomUUID();
    localStorage.setItem(ANON_KEY_STORAGE, k);
  }
  return k;
}

/**
 * Sticky A/B variant assignment. Returns null while resolving or if the user
 * falls outside traffic allocation. Automatically logs exposure once.
 */
export function useExperiment(experimentKey: string): string | null {
  const { user } = useAuth();
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const anonKey = user ? null : getAnonKey();
      const { data, error } = await supabase.rpc("assign_experiment_variant", {
        _experiment_key: experimentKey,
        _anon_key: anonKey,
      });
      if (cancelled || error || !data) return;
      setVariant(data as string);
      // Log exposure (fire-and-forget)
      const { data: exp } = await supabase
        .from("experiments")
        .select("id")
        .eq("key", experimentKey)
        .maybeSingle();
      if (exp?.id) {
        await supabase.from("experiment_exposures").insert({
          experiment_id: exp.id,
          variant_key: data as string,
          user_id: user?.id ?? null,
          anon_key: user ? null : anonKey,
        });
        await supabase.from("analytics_events").insert({
          event_name: "experiment_exposure",
          user_id: user?.id ?? null,
          properties: { experiment_key: experimentKey, variant_key: data },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [experimentKey, user?.id]);

  return variant;
}
