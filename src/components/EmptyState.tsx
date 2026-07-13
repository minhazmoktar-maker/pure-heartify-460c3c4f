import { LucideIcon, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import FadeIn from "@/components/FadeIn";
import EmptyIllustration, { type EmptyIllustrationVariant } from "@/components/EmptyIllustration";

type Tone = "default" | "muted" | "gold";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Optional illustration — takes precedence over `icon` when set. */
  illustration?: EmptyIllustrationVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryAction?: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const TONE_STYLES: Record<Tone, { icon: string; button: string }> = {
  default: {
    icon: "bg-primary/10 text-primary",
    button: "bg-primary text-primary-foreground",
  },
  muted: {
    icon: "bg-muted text-muted-foreground",
    button: "bg-primary text-primary-foreground",
  },
  gold: {
    icon: "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]",
    button: "bg-[hsl(var(--gold))] text-black",
  },
};

export default function EmptyState({
  icon: Icon = Sparkles,
  illustration,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryAction,
  tone = "default",
  className,
}: EmptyStateProps) {
  const styles = TONE_STYLES[tone];
  const action = actionLabel ? (
    actionHref ? (
      <Link
        to={actionHref}
        className={cn(
          "tap-target inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-transform hover:opacity-90 active:scale-[0.97]",
          styles.button,
        )}
      >
        {actionLabel}
      </Link>
    ) : (
      <button
        onClick={onAction}
        className={cn(
          "tap-target inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-transform hover:opacity-90 active:scale-[0.97]",
          styles.button,
        )}
      >
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <FadeIn
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center",
        className,
      )}
    >
      {illustration ? (
        <EmptyIllustration variant={illustration} className="mb-1 h-24 w-24" />
      ) : (
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {action}
          {secondaryAction}
        </div>
      )}
    </FadeIn>
  );
}
