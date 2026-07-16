import { ShieldCheck, BadgeCheck, Sparkles, Eye } from "lucide-react";
import { isTrustedChannel } from "@/data/trustedChannels";
import { cn } from "@/lib/utils";

interface TrustBadgesProps {
  channelTitle: string;
  halalScore: number;
  category?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Renders up to 3 trust signals so users instantly understand WHY a video
 * is on Heartify. Derived from existing metadata — no DB change required.
 */
const TrustBadges = ({ channelTitle, halalScore, category, size = "sm", className }: TrustBadgesProps) => {
  const trusted = isTrustedChannel(channelTitle);
  const highScore = halalScore >= 85;

  const tags: { icon: React.ReactNode; label: string; tone: "primary" | "gold" | "accent" | "muted" }[] = [];

  tags.push({
    icon: <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />,
    label: "Reviewed",
    tone: "primary",
  });

  if (trusted) {
    tags.push({
      icon: <BadgeCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />,
      label: "Trusted Creator",
      tone: "gold",
    });
  }

  if (highScore && !trusted) {
    tags.push({
      icon: <Sparkles className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />,
      label: "Up to 85% halal",
      tone: "accent",
    });
  }

  if (category && size === "md") {
    tags.push({
      icon: <Eye className="h-3.5 w-3.5" />,
      label: category,
      tone: "muted",
    });
  }

  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]",
    accent: "bg-accent/15 text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  };

  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-micro";

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {tags.map((t) => (
        <span
          key={t.label}
          className={cn(
            "inline-flex items-center gap-1 rounded-pill font-medium",
            padding,
            toneClasses[t.tone],
          )}
        >
          {t.icon}
          {t.label}
        </span>
      ))}
    </div>
  );
};

export default TrustBadges;
