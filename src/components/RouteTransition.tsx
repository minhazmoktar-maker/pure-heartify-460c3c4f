import { ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * iOS-style push/pop transitions on mobile; subtle fade on desktop.
 * - Uses only GPU-accelerated transforms/opacity → 60fps.
 * - Directional based on NavigationType (PUSH → slide in from right, POP → slide in from left).
 * - Respects prefers-reduced-motion (no animation).
 * - Complements EdgeSwipeBack: back gesture triggers a POP → correct animation direction.
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType(); // "PUSH" | "POP" | "REPLACE"
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();

  if (reduce) return <div id="main-content" tabIndex={-1}>{children}</div>;

  // Desktop → understated fade to avoid horizontal shift on wide viewports.
  if (!isMobile) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          id="main-content"
          tabIndex={-1}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ minHeight: "100%", outline: "none" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Mobile → iOS-style push/pop with matching easing curve.
  const isBack = navType === "POP";
  const enterX = isBack ? "-18%" : "18%";
  const exitX = isBack ? "18%" : "-18%";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        id="main-content"
        tabIndex={-1}
        initial={{ opacity: 0.6, x: enterX }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0.4, x: exitX }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        style={{ minHeight: "100%", outline: "none", willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
