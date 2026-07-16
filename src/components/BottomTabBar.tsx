import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, PlayCircle, Compass, BookOpen, User } from "lucide-react";
import { SPINES, shouldShowBottomBar, resolveSpine, type SpineId } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Mobile-only bottom tab bar — the product's spine made tangible.
 *
 * Rendering rules:
 *   - Hidden on immersive routes (see shouldShowBottomBar).
 *   - Hidden on md+ breakpoints; the existing Navbar and side surfaces
 *     serve larger viewports.
 *   - Highlights whichever tab owns the current route (resolveSpine).
 *
 * Accessibility:
 *   - role="navigation" + aria-label so screen readers announce it.
 *   - Each tab is a link with min 44px hit area.
 *   - aria-current="page" on the active spine.
 */

const ICONS: Record<SpineId, React.ComponentType<{ className?: string }>> = {
  home: Home,
  watch: PlayCircle,
  practice: Compass,
  learn: BookOpen,
  you: User,
};

export default function BottomTabBar() {
  const { pathname } = useLocation();
  const visible = shouldShowBottomBar(pathname);
  useEffect(() => {
    if (visible) {
      document.body.classList.add("has-bottom-bar");
      return () => document.body.classList.remove("has-bottom-bar");
    }
  }, [visible]);
  if (!visible) return null;
  const activeSpine = resolveSpine(pathname);

  return (
    <nav
      aria-label="Primary"
      role="navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-border/60 bg-card/95 backdrop-blur-xl",
        "pb-safe",
      )}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {SPINES.map((spine) => {
          const Icon = ICONS[spine.id];
          const isActive = spine.id === activeSpine;
          return (
            <li key={spine.id} className="flex-1">
              <NavLink
                to={spine.path}
                aria-current={isActive ? "page" : undefined}
                aria-label={spine.label}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-ds-xs py-ds-sm text-micro font-medium",
                  "transition-colors duration-micro ease-standard",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-micro ease-standard",
                    isActive && "scale-110",
                  )}
                  aria-hidden
                />
                <span>{spine.label}</span>
                {isActive && (
                  <span
                    aria-hidden
                    className="mt-0.5 h-0.5 w-6 rounded-pill bg-primary"
                  />
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
