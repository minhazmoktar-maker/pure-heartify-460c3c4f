import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Cheap device string for reporting/debugging. */
export const detectPlatform = (): string => {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh/i.test(ua)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  return "web";
};

export const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1));

export const isAndroid = () =>
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

interface RemotePos {
  track_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
}

/**
 * Cross-device "Continue listening" sync.
 * - On login, fetch remote positions and merge into localStorage (remote wins
 *   for newer timestamps).
 * - Expose `savePosition` (throttled by caller) for the player to call.
 */
export function useCrossDevicePlayback() {
  const { user } = useAuth();
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) { hydratedFor.current = null; return; }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;

    (async () => {
      const { data, error } = await supabase
        .from("audio_playback_positions")
        .select("track_id,position_seconds,duration_seconds,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error || !data) return;

      try {
        const raw = localStorage.getItem("heartify.audio.resume.v1");
        const local: Record<string, number> = raw ? JSON.parse(raw) : {};
        for (const row of data as RemotePos[]) {
          const remote = Number(row.position_seconds) || 0;
          if (!local[row.track_id] || remote > local[row.track_id]) {
            local[row.track_id] = remote;
          }
        }
        localStorage.setItem("heartify.audio.resume.v1", JSON.stringify(local));

        // Signal to the player context that positions have been merged.
        window.dispatchEvent(new CustomEvent("heartify:resume-hydrated", { detail: local }));
      } catch { /* ignore quota/parse */ }
    })();
  }, [user]);
}

/** Persist a single track's position to the backend (fire-and-forget). */
export async function persistPositionRemote(
  userId: string,
  trackId: string,
  positionSeconds: number,
  durationSeconds: number | null,
) {
  if (positionSeconds < 5) return; // skip trivial noise
  await supabase.from("audio_playback_positions").upsert(
    {
      user_id: userId,
      track_id: trackId,
      position_seconds: Math.floor(positionSeconds),
      duration_seconds: durationSeconds ? Math.floor(durationSeconds) : null,
      device: detectPlatform(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,track_id" },
  );
}
