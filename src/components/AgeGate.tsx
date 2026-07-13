import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "heartify.ageGate.v1";
const MIN_AGE = 13; // COPPA / most app stores

// Public / SEO / share / legal surfaces that must never be gated.
// Anything the crawler or a share-link recipient could hit before signing in.
const PUBLIC_PREFIXES = [
  "/privacy",
  "/terms",
  "/legal",
  "/about",
  "/trust",
  "/contact",
  "/appeals",
  "/share",
  "/s/",
  "/embed",
  "/reset-password",
  "/forgot-password",
  "/auth",
  "/login",
  "/signup",
  "/sitemap",
  "/robots",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export default function AgeGate() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Never gate signed-in users or public/SEO routes.
    if (authLoading) return;
    if (user) { setVisible(false); setBlocked(false); return; }
    if (isPublicPath(location.pathname)) { setVisible(false); setBlocked(false); return; }
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (!v) { setVisible(true); return; }
      const parsed = JSON.parse(v);
      if (parsed?.blocked) setBlocked(true);
      else setVisible(false);
    } catch {
      // If we can't read storage, don't hard-block the app — allow through.
      setVisible(false);
    }
  }, [user, authLoading, location.pathname]);

  const confirm = () => {
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    const d = new Date(dob);
    if (isNaN(d.getTime())) {
      setError("Enter a valid date.");
      return;
    }
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;

    if (age < MIN_AGE) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ blocked: true, at: new Date().toISOString() }));
      } catch { /* ignore */ }
      setBlocked(true);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ confirmedAge: age, at: new Date().toISOString() }));
    } catch { /* ignore */ }
    setVisible(false);
  };

  const resetGate = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setBlocked(false);
    setDob("");
    setError(null);
    setVisible(true);
  };

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
          <h2 className="text-lg font-semibold text-foreground">Thank you for visiting Heartify</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to be at least {MIN_AGE} years old to use this service.
            Please come back when you're old enough — jazakAllahu khayran.
          </p>
          <button
            onClick={resetGate}
            className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
          >
            Entered the wrong date? Try again.
          </button>
        </div>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Age verification"
      className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">Welcome to Heartify</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Please confirm your date of birth. Heartify is intended for users aged {MIN_AGE} and above.
        </p>
        <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="dob-input">
          Date of birth
        </label>
        <input
          id="dob-input"
          type="date"
          value={dob}
          onChange={(e) => { setDob(e.target.value); setError(null); }}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          max={new Date().toISOString().slice(0, 10)}
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <button
          onClick={confirm}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Continue
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          We store your confirmation in your browser only. We never share this date.
        </p>
      </div>
    </div>
  );
}
