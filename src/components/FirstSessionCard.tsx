import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "heartify-first-session-dismissed";

/**
 * Home banner shown to signed-in users who have not completed onboarding.
 *
 * - Session-scoped dismissal (sessionStorage) so it never nags on the same
 *   session but returns after a full app restart until the user completes.
 * - Hidden entirely for signed-out users (Hero already covers that case)
 *   and for anyone with `onboarding_completed_at` set.
 * - Renders nothing while the query is loading to avoid a layout flash.
 */
export default function FirstSessionCard() {
  const status = useOnboardingStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  if (status.loading || !status.isNew || dismissed) return null;

  const pct = Math.round(status.completeness * 100);

  return (
    <section
      aria-label="Personalize your Heartify"
      className={cn(
        "mx-auto mt-3 max-w-[1800px] px-4 md:px-6",
      )}
    >
      <div className="relative overflow-hidden rounded-card border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-e1 motion-safe:transition-shadow motion-safe:duration-short md:p-5">
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
            setDismissed(true);
          }}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-heading font-semibold text-foreground">
                Welcome — let's tune your Daily Dose
              </h2>
              <p className="mt-1 text-caption text-muted-foreground">
                A quick 90-second setup picks your reciter, language, and the
                topics that fill your feed. You can change anything later.
              </p>
              <div className="mt-3 flex items-center gap-3" aria-hidden>
                <div className="h-1.5 flex-1 max-w-[200px] overflow-hidden rounded-pill bg-muted">
                  <div
                    className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-medium"
                    style={{ width: `${Math.max(6, pct)}%` }}
                  />
                </div>
                <span className="text-micro font-medium text-muted-foreground">
                  {pct}% complete
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-pill bg-primary px-5 py-2.5 text-body font-semibold text-primary-foreground shadow-e1 motion-safe:transition-transform motion-safe:duration-micro hover:brightness-110 active:scale-[0.98]"
          >
            Start setup
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
