import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Flag {
  key: string;
  enabled: boolean;
  rollout_percent: number;
}

let cache: Record<string, Flag> | null = null;
let inflight: Promise<Record<string, Flag>> | null = null;

async function fetchAll(): Promise<Record<string, Flag>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from("feature_flags")
      .select("key,enabled,rollout_percent");
    const map: Record<string, Flag> = {};
    (data ?? []).forEach((f) => (map[f.key] = f as Flag));
    cache = map;
    return map;
  })();
  return inflight;
}

/**
 * Simple client-side feature flag hook. Rollout percent is a stable hash
 * of `key + anonymous session id` so the same user sees a consistent value.
 */
export function useFeatureFlag(key: string, fallback = false): boolean {
  const [enabled, setEnabled] = useState<boolean>(fallback);
  useEffect(() => {
    let mounted = true;
    fetchAll().then((flags) => {
      if (!mounted) return;
      const flag = flags[key];
      if (!flag) {
        setEnabled(fallback);
        return;
      }
      if (!flag.enabled) {
        setEnabled(false);
        return;
      }
      if (flag.rollout_percent >= 100) {
        setEnabled(true);
        return;
      }
      // Stable per-visitor bucket
      const sid = typeof window !== "undefined" ? (localStorage.getItem("heartify.viz") ?? "anon") : "ssr";
      let h = 0;
      const s = `${key}:${sid}`;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      const bucket = Math.abs(h) % 100;
      setEnabled(bucket < flag.rollout_percent);
    });
    return () => {
      mounted = false;
    };
  }, [key, fallback]);
  return enabled;
}

export function invalidateFeatureFlags() {
  cache = null;
  inflight = null;
}
