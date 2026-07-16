import { Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockedBadgeProps {
  /** Compact = tiny pill for card corners. Default false = inline chip. */
  compact?: boolean;
  label?: string;
  className?: string;
}

/**
 * Visual marker that a piece of content is Heartify+ only.
 * Purely presentational — actual gating is enforced server-side.
 */
export default function LockedBadge({ compact, label = "Plus", className }: LockedBadgeProps) {
  if (compact) {
    return (
      <span
        aria-label="Heartify Plus exclusive"
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-pill bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))] ring-1 ring-[hsl(var(--gold))]/40",
          className,
        )}
      >
        <Lock className="h-3 w-3" aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[hsl(var(--gold))]",
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden /> {label}
    </span>
  );
}
