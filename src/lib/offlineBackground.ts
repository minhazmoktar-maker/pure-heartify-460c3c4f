/**
 * Keeps offline downloads alive while the app is backgrounded or the phone is
 * locked.
 *
 * Reality of mobile WebViews:
 * - iOS suspends JS shortly after the app leaves the foreground, and an
 *   in-flight `fetch` may be torn down without an error ever surfacing.
 * - Android is more permissive but Doze can still stall a transfer.
 *
 * The download core already checkpoints partial bytes every ~2s and resumes
 * with HTTP Range requests, so the only missing piece is *re-arming* the queue
 * the moment we get execution time back. This module listens to every signal
 * that indicates "we're running again" (Capacitor `appStateChange`/`resume`,
 * page visibility, focus, network back online) and nudges the queue, which
 * re-queues stalled items and continues them from where they stopped.
 *
 * It is safe to call `startBackgroundDownloads()` more than once.
 */
import { nudgeQueue, resumeInterruptedDownloads } from "@/lib/offlineQueue";
import { diag } from "@/lib/diagnostics";

let started = false;
let lastNudge = 0;
/** Coalesce the several signals that fire together on a single resume. */
const NUDGE_THROTTLE_MS = 1_500;

function nudge(reason: string): void {
  const now = Date.now();
  if (now - lastNudge < NUDGE_THROTTLE_MS) return;
  lastNudge = now;
  try {
    const revived = nudgeQueue();
    void resumeInterruptedDownloads();
    if (revived > 0) diag("download", "background_resumed", { reason, revived });
  } catch { /* never break app resume on a download detail */ }
}

export function startBackgroundDownloads(): () => void {
  if (typeof window === "undefined" || started) return () => {};
  started = true;

  const onVisible = () => { if (document.visibilityState === "visible") nudge("visible"); };
  const onFocus = () => nudge("focus");
  const onOnline = () => nudge("online");

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);

  // Capacitor native lifecycle (present only inside the iOS/Android shell).
  let removeNative: () => void = () => {};
  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const state = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) nudge("appStateChange");
      });
      const resume = await App.addListener("resume", () => nudge("native_resume"));
      removeNative = () => { void state.remove(); void resume.remove(); };
    } catch { /* web build — DOM listeners above are enough */ }
  })();

  return () => {
    started = false;
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onOnline);
    removeNative();
  };
}
