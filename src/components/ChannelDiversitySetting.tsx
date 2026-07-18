// Channel diversity setting — lives in Profile > Preferences.
// When enabled, tightens per-channel cap so the feed surfaces more unique
// channels instead of stacking multiple videos from the same one.

import { Shuffle } from "lucide-react";
import { useShowMoreChannelsSetting } from "@/contexts/FeedDiversityContext";
import { soundTap } from "@/lib/soundHaptics";
import { cn } from "@/lib/utils";

export default function ChannelDiversitySetting() {
  const [enabled, setEnabled] = useShowMoreChannelsSetting();

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-pill",
              enabled ? "bg-primary/15 text-primary" : "bg-secondary text-foreground",
            )}
            aria-hidden
          >
            <Shuffle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Show more channels</h2>
            <p className="text-micro text-muted-foreground">
              Diversifies your feed by limiting how many videos appear from the same channel.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Turn Show more channels off" : "Turn Show more channels on"}
          onClick={() => {
            soundTap();
            setEnabled(!enabled);
          }}
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
