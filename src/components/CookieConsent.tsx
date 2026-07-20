import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

const STORAGE_KEY = "heartify.cookieConsent.v1";

type Choice = "accepted" | "essential" | "dismissed";

/**
 * Slim, thumb-safe cookie toast (~52px). Dismisses on first meaningful
 * interaction (scroll, keydown, or first tap outside the toast) so it never
 * blocks the fold on primary surfaces like Dhikr / Prayer / 404.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch { /* privacy mode */ }
  }, []);

  const decide = (choice: Choice) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, at: new Date().toISOString() }),
      );
    } catch { /* ignore */ }
    setVisible(false);
  };

  // Auto-dismiss as "essential only" on first scroll / navigation intent.
  useEffect(() => {
    if (!visible) return;
    const onScroll = () => { if (window.scrollY > 120) decide("essential"); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-[70] md:inset-x-auto md:right-4 md:bottom-4 md:max-w-md"
    >
      <div className="flex items-center gap-3 rounded-pill border border-border bg-card/95 py-2 pl-4 pr-2 shadow-e2 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <p className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
          We use cookies to keep you signed in.{" "}
          <button
            onClick={() => decide("essential")}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Essential only
          </button>
          {" · "}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy
          </Link>
        </p>
        <button
          onClick={() => decide("accepted")}
          className="shrink-0 rounded-pill bg-primary px-3 py-1.5 text-micro font-semibold text-primary-foreground hover:opacity-90"
        >
          Accept
        </button>
        <button
          onClick={() => decide("dismissed")}
          aria-label="Dismiss cookie notice"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function hasAcceptedAnalytics(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return JSON.parse(raw).choice === "accepted";
  } catch {
    return false;
  }
}
