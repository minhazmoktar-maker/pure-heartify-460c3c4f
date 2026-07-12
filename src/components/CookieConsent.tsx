import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "heartify.cookieConsent.v1";

type Choice = "accepted" | "essential";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* privacy mode */
    }
  }, []);

  const decide = (choice: Choice) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, at: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies to keep you signed in and remember your preferences.
          Analytics stay off unless you accept.{" "}
          <Link to="/privacy" className="underline text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => decide("essential")}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
          >
            Essential only
          </button>
          <button
            onClick={() => decide("accepted")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Accept all
          </button>
        </div>
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
