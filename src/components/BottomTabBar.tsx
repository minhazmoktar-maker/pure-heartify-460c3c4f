import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Compass, Library, User } from "lucide-react";
import { SPINES, shouldShowBottomBar, resolveSpine, type SpineId } from "@/lib/navigation";
import { soundTap } from "@/lib/soundHaptics";
import { cn } from "@/lib/utils";

/**
 * Mobile-only bottom tab bar — Home · Explore · Library · Profile.
 * The 4 spines reflect Heartify's identity: halal-first video &
 * content discovery. Supporting Islamic tools live one tap deep
 * under Profile → More rather than competing for tab space.
 */

const ICONS: Record<SpineId, React.ComponentType<{ className?: string }>> = {
  home: Home,
  explore: Compass,
  library: Library,
  profile: User,
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
        "pb-safe px-safe-x",
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
                onClick={() => { if (!isActive) soundTap(); }}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-ds-xs py-ds-sm text-micro font-medium pressable",
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
