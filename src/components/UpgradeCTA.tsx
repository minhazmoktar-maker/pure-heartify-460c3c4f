import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntitlement } from "@/hooks/useEntitlement";
import { cn } from "@/lib/utils";

interface UpgradeCTAProps {
  /** Optional feature name shown in the CTA copy, e.g. "unlimited downloads". */
  feature?: string;
  /** Compact inline variant (small pill). Default false = full call-out card. */
  compact?: boolean;
  className?: string;
}

/**
 * Reusable upgrade-to-Heartify+ CTA. Reads live entitlement — renders nothing
 * for members or while loading, so it never flashes for paying users.
 */
export default function UpgradeCTA({ feature, compact, className }: UpgradeCTAProps) {
  const { isPremium, loading } = useEntitlement();
  if (loading || isPremium) return null;

  if (compact) {
    return (
      <Link
        to="/plus"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10 px-3 py-1 text-micro font-medium text-[hsl(var(--gold))] transition-colors hover:bg-[hsl(var(--gold))]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]",
          className,
        )}
      >
        <Sparkles className="h-3 w-3" aria-hidden />
        <span>Get Heartify+{feature ? ` for ${feature}` : ""}</span>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-[hsl(var(--gold))]/30 bg-gradient-to-br from-[hsl(var(--gold))]/10 via-background to-background p-5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      role="region"
      aria-label="Upgrade to Heartify Plus"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]"
          aria-hidden
        >
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold text-foreground">
            {feature ? `${feature} is a Heartify+ feature` : "Unlock the full Heartify+ experience"}
          </p>
          <p className="mt-0.5 text-micro text-muted-foreground">
            Unlimited offline audio, exclusive reciters, family seats, and guided Khatm programs.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to="/plus" aria-label="See Heartify Plus plans">
          See plans
        </Link>
      </Button>
    </div>
  );
}
