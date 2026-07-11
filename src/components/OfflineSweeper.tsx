import { useEffect } from "react";
import { purgeExpiredOffline } from "@/lib/audioOffline";

/**
 * Background sweeper for expired free-tier offline downloads.
 * Runs on app boot, every 5 minutes while the tab is open, and when the
 * tab regains focus. Silent — the caller sees nothing.
 */
export default function OfflineSweeper() {
  useEffect(() => {
    let cancelled = false;
    const sweep = () => {
      if (cancelled) return;
      purgeExpiredOffline().catch(() => { /* silent */ });
    };
    sweep();
    const interval = window.setInterval(sweep, 5 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") sweep(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
