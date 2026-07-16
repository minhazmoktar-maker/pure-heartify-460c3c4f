import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Server-side evaluated flag: honors kill_switch, cohort, and rollout_percent.
 * Falls back to `defaultValue` on error.
 */
export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(defaultValue);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("evaluate_feature_flag", {
        _key: key,
        _user_id: user?.id ?? null,
      });
      if (cancelled) return;
      const value = error ? defaultValue : !!data;
      setEnabled(value);
      // Fire-and-forget analytics — skipped for anonymous callers because
      // analytics_events RLS requires an authenticated session.
      if (user?.id) {
        supabase
          .from("analytics_events")
          .insert({
            event_name: "feature_flag_evaluated",
            user_id: user.id,
            properties: { flag_key: key, enabled: value },
          })
          .then(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, user?.id, defaultValue]);

  return enabled;
}

/** Legacy no-op export kept for compatibility; server-evaluated flags don't need cache invalidation. */
export function invalidateFeatureFlags(): void {}


