import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Global offline indicator. Fixed to the top of the viewport, respects
 * safe-area, and stays out of the way when online. Rendered once from
 * <App/> so every route inherits it without extra wiring.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

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

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] pt-safe px-safe-x pointer-events-none"
    >
      <div className="mx-auto mt-2 flex max-w-md items-center justify-center gap-2 rounded-pill bg-foreground/90 px-4 py-2 text-caption font-medium text-background shadow-e2 backdrop-blur">
        <WifiOff className="h-4 w-4" aria-hidden />
        <span>You're offline — showing cached content</span>
      </div>
    </div>
  );
}
