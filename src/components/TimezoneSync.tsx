import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { detectTimezone } from "@/lib/intl";
import { diag } from "@/lib/diagnostics";

const KEY = "heartify.tz.synced.v1";

/**
 * Persists the device's IANA timezone to the account so server-side jobs
 * (streak day boundaries, streak-risk pushes, adhan/quiet-hours windows)
 * evaluate "today" and "evening" in the user's own timezone instead of UTC.
 *
 * Cheap: writes at most once per day, and only when the timezone changed
 * (travel, DST region change) or was never recorded.
 */
export default function TimezoneSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const tz = detectTimezone();
    if (!tz || tz === "UTC" && !navigator.language) return;

    let cached: { tz?: string; at?: number; uid?: string } = {};
    try {
      cached = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      cached = {};
    }
    const fresh =
      cached.uid === user.id &&
      cached.tz === tz &&
      typeof cached.at === "number" &&
      Date.now() - cached.at < 24 * 60 * 60 * 1000;
    if (fresh) return;

    let cancelled = false;
    (async () => {
      const { error } = await supabase.rpc("set_my_timezone", { _tz: tz });
      if (cancelled) return;
      if (error) {
        diag("streak", "timezone_sync_error", { tz, code: error.code, message: error.message });
        return;
      }
      diag("streak", "timezone_synced", { tz });
      try {
        localStorage.setItem(KEY, JSON.stringify({ tz, at: Date.now(), uid: user.id }));
      } catch {
        /* storage full / private mode — retry next mount */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return null;
}
