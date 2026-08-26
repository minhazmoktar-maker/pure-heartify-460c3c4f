/**
 * Lane telemetry — per-country / per-language signals used to validate the
 * 80/20 native-vs-diversified rule.
 *
 * Events are batched in memory and flushed through the `log_lane_events` RPC
 * (anon-safe, rate-capped server side). Nothing here identifies the viewer
 * beyond the session id already used for feed shuffling.
 */
import { supabase } from "@/integrations/supabase/client";

export type LaneKind = "impression" | "click" | "watch";
export type LaneName = "native" | "diversified";

export interface LaneEvent {
  kind: LaneKind;
  lane: LaneName;
  video_id?: string;
  country?: string | null;
  ui_language?: string | null;
  content_language?: string | null;
  watched_seconds?: number;
  duration_seconds?: number;
}

const MAX_BATCH = 60;
const FLUSH_MS = 4_000;

let queue: LaneEvent[] = [];
let timer: number | null = null;
let inFlight = false;

function sessionId(): string {
  try {
    const key = "heartify.session_id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function flushLaneEvents(): Promise<void> {
  if (inFlight || queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(batch.length);
  inFlight = true;
  try {
    const sid = sessionId();
    await supabase.rpc("log_lane_events", {
      p_events: batch.map((e) => ({ ...e, session_id: sid })),
    });
  } catch {
    // Telemetry is best-effort: never surface or retry-loop on failure.
  } finally {
    inFlight = false;
  }
}

export function trackLaneEvent(event: LaneEvent): void {
  queue.push(event);
  if (queue.length >= MAX_BATCH) {
    void flushLaneEvents();
    return;
  }
  if (timer == null) {
    timer = window.setTimeout(() => {
      timer = null;
      void flushLaneEvents();
    }, FLUSH_MS);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushLaneEvents();
  });
}
