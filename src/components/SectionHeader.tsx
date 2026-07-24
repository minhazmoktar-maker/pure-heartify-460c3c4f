import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  /** Optional custom action slot rendered on the right (replaces the built-in action button). */
  actions?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  align?: "start" | "center";
}

/**
 * Canonical section header: icon + title + optional description + optional "See all" action.
 * Use across pages and list rows so typography, spacing, and behavior stay consistent.
 */
export default function SectionHeader({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionTo,
  onAction,
  actions,
  className,
  as: Heading = "h2",
  align = "start",
}: SectionHeaderProps) {
  const showAction = Boolean(actionLabel && (actionTo || onAction));
  return (
    <div
      className={cn(
        "mb-4 flex items-end justify-between gap-4",
        align === "center" && "items-center",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className="flex items-center gap-2 font-heading text-heading font-bold tracking-tight text-foreground sm:text-title">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
          <span className="truncate">{title}</span>
        </Heading>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions ? (
        <div className="shrink-0">{actions}</div>
      ) : showAction && (
        actionTo ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Link to={actionTo} aria-label={`${actionLabel}: ${title}`}>
              {actionLabel}
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAction}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={`${actionLabel}: ${title}`}
          >
            {actionLabel}
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        )
      )}
    </div>
  );
}
