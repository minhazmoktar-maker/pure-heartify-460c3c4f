/**
 * useImpressionTracker
 *
 * Batches feed video impressions and flushes them to the `log_feed_impressions`
 * RPC. Flushes on: visibility change, beforeunload, or every 15s while active.
 * Deduped per-session so the same card can't be counted 10x while scrolling.
 */
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const FLUSH_INTERVAL_MS = 15_000;
const MAX_BATCH = 100;

export function useImpressionTracker(enabled: boolean = true) {
  const queueRef = useRef<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);

  const flush = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    const q = queueRef.current;
    if (q.size === 0) return;
    const batch = Array.from(q).slice(0, MAX_BATCH);
    q.clear();
    inFlightRef.current = true;
    try {
      await supabase.rpc("log_feed_impressions", { _video_ids: batch });
    } catch (e) {
      // Best-effort — put items back for a later flush
      for (const id of batch) q.add(id);
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled]);

  const track = useCallback(
    (videoId: string | undefined | null) => {
      if (!enabled || !videoId) return;
      if (seenRef.current.has(videoId)) return;
      seenRef.current.add(videoId);
      queueRef.current.add(videoId);
    },
    [enabled],
  );

  const markAction = useCallback(
    async (videoId: string, action: "watch" | "complete" | "save" | "share" | "follow" | "rewatch" | "skip" | "not_interested") => {
      if (!videoId) return;
      try {
        await supabase.rpc("mark_feed_action", { _video_id: videoId, _action: action });
      } catch {
        /* silent — best-effort */
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(flush, FLUSH_INTERVAL_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onUnload = () => flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      flush();
    };
  }, [enabled, flush]);

  return { track, flush, markAction };
}
