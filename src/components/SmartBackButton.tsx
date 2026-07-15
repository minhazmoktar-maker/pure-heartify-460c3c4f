import { ChevronLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { resolveSpine, spinePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * SmartBackButton — Back that never leads to a dead-end.
 *
 * Priority:
 *   1. If the app has in-app history (history.state.idx > 0), use browser back.
 *   2. Otherwise fall back to the spine root that owns this route.
 *      (Ensures direct-linked pages have a coherent "up" target.)
 *
 * Drop-in replacement for ad-hoc `navigate(-1)` calls. Preserve existing
 * back buttons — just swap the click handler where useful.
 */
export interface SmartBackButtonProps {
  label?: string;
  className?: string;
  /** Explicit fallback path. Overrides spine resolution. */
  fallback?: string;
}

export default function SmartBackButton({
  label = "Back",
  className,
  fallback,
}: SmartBackButtonProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const onClick = () => {
    // react-router stashes an idx in history.state for PUSH entries.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) {
      navigate(-1);
      return;
    }
    const target = fallback ?? spinePath(resolveSpine(pathname));
    navigate(target, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "tap-target inline-flex items-center gap-ds-xs rounded-card px-ds-sm text-caption font-medium text-foreground",
        "transition-colors duration-micro ease-standard hover:bg-secondary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
