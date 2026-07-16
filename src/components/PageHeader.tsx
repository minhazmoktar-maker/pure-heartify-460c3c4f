import { ArrowLeft, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared page header: back button + icon + title + optional subtitle & actions.
 * Standardizes spacing across ~80 static content pages.
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  backHref = "/",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start gap-3 border-b border-border/60 pb-4 mb-6",
        className,
      )}
    >
      <Button
        asChild
        variant="ghost"
        size="icon"
        aria-label="Back"
        className="shrink-0 -ml-2"
      >
        <Link to={backHref}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-heading text-title font-bold tracking-tight text-foreground sm:text-title">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
