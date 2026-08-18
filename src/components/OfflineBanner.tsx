import { useEffect, useState } from "react";
import { CloudOff, WifiOff } from "lucide-react";
import {
  backendRetryInSeconds,
  getBackendState,
  subscribeBackendState,
  type BackendState,
} from "@/lib/backendHealth";

/**
 * Global connectivity indicator. Fixed to the top of the viewport, respects
 * safe-area, and stays out of the way when everything is healthy. Rendered
 * once from <App/> so every route inherits it without extra wiring.
 *
 * Two states, in priority order:
 *  1. Device offline (navigator.onLine === false).
 *  2. Backend circuit breaker open — one calm "temporarily unavailable,
 *     retrying in Ns" line instead of a toast per failed surface.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [backend, setBackend] = useState<BackendState>(() => getBackendState());
  const [retryIn, setRetryIn] = useState(0);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => subscribeBackendState(setBackend), []);

  // Tick the countdown only while the breaker is open.
  useEffect(() => {
    if (backend !== "down") {
      setRetryIn(0);
      return;
    }
    setRetryIn(backendRetryInSeconds());
    const id = window.setInterval(() => setRetryIn(backendRetryInSeconds()), 1000);
    return () => window.clearInterval(id);
  }, [backend]);

  if (online && backend !== "down") return null;

  const offline = !online;
  const Icon = offline ? WifiOff : CloudOff;
  const message = offline
    ? "You're offline — showing cached content"
    : retryIn > 0
      ? `Service temporarily unavailable — retrying in ${retryIn}s`
      : "Service temporarily unavailable — reconnecting…";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] pt-safe px-safe-x pointer-events-none"
    >
      <div className="mx-auto mt-2 flex max-w-md items-center justify-center gap-2 rounded-pill bg-foreground/90 px-4 py-2 text-caption font-medium text-background shadow-e2 backdrop-blur">
        <Icon className="h-4 w-4" aria-hidden />
        <span>{message}</span>
      </div>
    </div>
  );
}
