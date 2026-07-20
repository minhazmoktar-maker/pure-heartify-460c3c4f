import { useEffect, useState } from "react";

const STORAGE_KEY = "heartify.cookieConsent.v1";

type Choice = "accepted" | "essential" | "dismissed" | null;

function readChoice(): { choice: Choice; at?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { choice: null };
    const j = JSON.parse(raw);
    return { choice: j?.choice ?? null, at: j?.at };
  } catch {
    return { choice: null };
  }
}

/**
 * Manage-cookies panel — the discoverable, non-toast surface for consent.
 * Lives inside /privacy so users have a stable, expected place to change
 * their mind. Never bundles legal copy — that's the surrounding policy.
 */
export default function CookiePreferencesPanel() {
  const [state, setState] = useState<{ choice: Choice; at?: string }>({ choice: null });

  useEffect(() => { setState(readChoice()); }, []);

  const set = (choice: Exclude<Choice, null>) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, at: new Date().toISOString() }),
      );
    } catch { /* ignore */ }
    setState(readChoice());
  };

  const label =
    state.choice === "accepted" ? "All cookies accepted"
    : state.choice === "essential" ? "Essential cookies only"
    : state.choice === "dismissed" ? "Not decided"
    : "Not decided";

  return (
    <div
      id="manage-cookies"
      className="scroll-mt-24 rounded-card border border-border bg-card p-5"
    >
      <h2 className="font-heading text-heading font-bold text-foreground">
        Manage cookies
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Change your cookie preference at any time. Current setting:{" "}
        <span className="font-semibold text-foreground">{label}</span>
        {state.at ? <> · updated {new Date(state.at).toLocaleDateString()}</> : null}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => set("essential")}
          className="rounded-pill border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          Essential only
        </button>
        <button
          onClick={() => set("accepted")}
          className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
