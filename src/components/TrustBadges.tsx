import { ShieldCheck, BadgeCheck, Sparkles, Eye } from "lucide-react";
import { isTrustedChannel } from "@/data/trustedChannels";
import { cn } from "@/lib/utils";

interface TrustBadgesProps {
  channelTitle: string;
  /** Kept for backwards compatibility with callers; no longer displayed. */
  halalScore?: number;
  category?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Renders up to 3 trust signals so users instantly understand WHY a video
 * is on Heartify. Derived from existing metadata — no DB change required.
 */
const TrustBadges = ({ channelTitle, category, size = "sm", className }: TrustBadgesProps) => {
  const trusted = isTrustedChannel(channelTitle);

  // One badge per card. Trusted creators win over the generic Reviewed chip;
  // the old "85% halal" score chip is intentionally gone — it invited the
  // wrong question ("what about the other 15%?").
  const tag: { icon: React.ReactNode; label: string; tone: "primary" | "gold" | "muted" } = trusted
    ? {
        icon: <BadgeCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />,
        label: "Trusted",
        tone: "gold",
      }
    : {
        icon: <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />,
        label: "Reviewed",
        tone: "primary",
      };

  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]",
    muted: "bg-muted text-muted-foreground",
  };

  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-micro";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-pill font-medium",
          padding,
          toneClasses[tag.tone],
        )}
      >
        {tag.icon}
        {tag.label}
      </span>
      {category && size === "md" ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-pill font-medium",
            padding,
            toneClasses.muted,
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          {category}
        </span>
      ) : null}
    </div>
  );
};

export default TrustBadges;

