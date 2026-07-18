// Kids Mode setting — lives in Profile > Preferences.
// Locks the feed to safe-content-only for young viewers.

import { Baby } from "lucide-react";
import { useKidsMode } from "@/contexts/KidsModeContext";
import { soundTap } from "@/lib/soundHaptics";
import { cn } from "@/lib/utils";

export default function KidsModeSetting() {
  const { enabled, toggle } = useKidsMode();
  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-pill",
              enabled ? "bg-primary/15 text-primary" : "bg-secondary text-foreground",
            )}
            aria-hidden
          >
            <Baby className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Kids mode</h2>
            <p className="text-micro text-muted-foreground">
              Restricts the feed to child-safe Islamic and educational content.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Turn Kids mode off" : "Turn Kids mode on"}
          onClick={() => { soundTap(); toggle(); }}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform",
              enabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
    </section>
  );
}
