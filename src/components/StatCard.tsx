import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "primary" | "accent";
  className?: string;
}

/**
 * Canonical stat tile used across dashboard-style pages (Journal, Achievements,
 * DhikrCircles, Analytics, etc.). Unifies typography, spacing, and hover motion.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group rounded-xl border border-border bg-card p-4 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-card-hover",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={cn(
              "font-heading text-2xl font-bold leading-none tracking-tight",
              tone === "primary" && "text-primary",
              tone === "accent" && "text-gradient-gold",
              tone === "default" && "text-foreground",
            )}
          >
            {value}
          </div>
          <div className="mt-2 truncate text-xs text-muted-foreground">{label}</div>
          {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{hint}</div>}
        </div>
        {Icon && (
          <Icon
            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
