/**
 * useImpressionTracker
 *
 * Batches feed video impressions and flushes them to the `log_feed_impressions`
 * RPC. Flushes quickly while active, and again on page hide/unmount.
 * Deduped per-session so the same card can't be counted 10x while scrolling.
 */
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const FLUSH_INTERVAL_MS = 3_000;
const FLUSH_DEBOUNCE_MS = 900;
const FLUSH_ON_QUEUE_SIZE = 8;
const MAX_BATCH = 100;

export function useImpressionTracker(enabled: boolean = true) {
  const queueRef = useRef<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  // The RPC is authenticated-only by design (anon EXECUTE was revoked as a
  // security fix). Track sign-in state so anonymous sessions never fire it.
  const signedInRef = useRef(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) signedInRef.current = !!data.session;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      signedInRef.current = !!session;
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const flush = useCallback(async () => {
    if (!enabled || !signedInRef.current || inFlightRef.current) return;
    const q = queueRef.current;
    if (q.size === 0) return;
    const batch = Array.from(q).slice(0, MAX_BATCH);
    for (const id of batch) q.delete(id);
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
      if (!enabled || !videoId || !signedInRef.current) return;
      if (seenRef.current.has(videoId)) return;
      seenRef.current.add(videoId);
      queueRef.current.add(videoId);
      if (queueRef.current.size >= FLUSH_ON_QUEUE_SIZE) {
        void flush();
        return;
      }
      if (debounceRef.current === null) {
        debounceRef.current = window.setTimeout(() => {
          debounceRef.current = null;
          void flush();
        }, FLUSH_DEBOUNCE_MS);
      }
    },
    [enabled, flush],
  );

  const markAction = useCallback(
    async (videoId: string, action: "watch" | "complete" | "save" | "share" | "follow" | "rewatch" | "skip" | "not_interested") => {
      if (!videoId || !signedInRef.current) return;
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
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      flush();
    };
  }, [enabled, flush]);

  return { track, flush, markAction };
}
