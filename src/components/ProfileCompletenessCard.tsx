import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { cn } from "@/lib/utils";

interface Row {
  key: string;
  label: string;
  done: boolean;
  to: string;
}

/**
 * Compact activation checklist shown at the top of the Profile tab.
 * Hides itself once every step is complete so returning power-users don't
 * see clutter. Each row links directly to where the field is edited.
 */
export default function ProfileCompletenessCard() {
  const s = useOnboardingStatus();
  if (s.loading) return null;

  const rows: Row[] = [
    { key: "name",     label: "Set a display name",      done: s.hasDisplayName,  to: "/profile" },
    { key: "avatar",   label: "Add a profile photo",     done: s.hasAvatar,       to: "/profile" },
    { key: "bio",      label: "Write a short bio",       done: s.hasBio,          to: "/profile" },
    { key: "interests",label: "Pick your interests",     done: s.hasInterests,    to: "/onboarding" },
    { key: "reciter",  label: "Choose a favourite reciter", done: s.hasReciter,   to: "/onboarding" },
    { key: "reminder", label: "Set your Daily Dose time",   done: s.hasReminderHour, to: "/onboarding" },
  ];

  const doneCount = rows.filter((r) => r.done).length;
  if (doneCount === rows.length) return null;

  const pct = Math.round((doneCount / rows.length) * 100);

  return (
    <section
      aria-label="Profile completeness"
      className="rounded-card border border-border bg-card p-5 shadow-e1"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-heading font-semibold text-foreground">
          Complete your profile
        </h3>
        <span className="text-micro font-medium text-muted-foreground">
          {doneCount} of {rows.length}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-pill bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-medium"
          style={{ width: `${Math.max(6, pct)}%` }}
        />
      </div>
      <ul className="mt-4 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.key}>
            <Link
              to={r.to}
              className="flex items-center justify-between gap-3 py-2.5 text-body text-foreground motion-safe:transition-colors motion-safe:duration-micro hover:text-primary"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-pill border",
                    r.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {r.done ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className={cn(r.done && "text-muted-foreground line-through")}>
                  {r.label}
                </span>
              </span>
              {!r.done && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
