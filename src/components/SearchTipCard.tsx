import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "heartify-search-tip-dismissed";

/**
 * First-time-visitor tip shown on the empty search state. Explains the
 * halal-scoped index and typo tolerance so people trust the box and know
 * what to ask. Dismissal is persisted so returning users never see it.
 */
export default function SearchTipCard() {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  return (
    <aside
      aria-label="How search works on Heartify"
      className="relative mb-6 rounded-card border border-primary/25 bg-primary/5 p-4 md:p-5"
    >
      <button
        type="button"
        aria-label="Dismiss tip"
        onClick={() => {
          try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
          setDismissed(true);
        }}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-heading font-semibold text-foreground">
            How Heartify search works
          </h2>
          <p className="mt-1 text-caption text-muted-foreground">
            Typo-tolerant. Scoped to trusted creators and scholar-reviewed
            content. Try a reciter, surah, topic, or dua by name — even if you
            spell it phonetically.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-micro font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Off-brand queries are politely blocked, not silently dropped.
          </p>
        </div>
      </div>
    </aside>
  );
}
