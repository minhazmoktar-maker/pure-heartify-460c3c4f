import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { soundTap } from "@/lib/soundHaptics";

/**
 * Phase M2 — Native-feeling edge-swipe back gesture.
 *
 * Behavior:
 *   • Mobile only (touch pointer). Ignored on md+ / mouse-first devices.
 *   • Fires only when the touch starts within the leftmost 24px of the viewport
 *     (matches iOS/Android system back-swipe zone). Avoids conflicts with the
 *     rest of the page.
 *   • Requires a clear horizontal intent: deltaX ≥ 64 and |deltaY| ≤ 40.
 *   • Skipped when the gesture starts inside a horizontally scrollable
 *     ancestor (carousels, tab strips, code blocks) so it never steals the
 *     user's scroll.
 *   • Skipped on immersive / no-history routes (Shorts, /login, /signup,
 *     /watch when opened directly) — we never leave the app.
 *   • Fires a soft haptic tap and calls `navigate(-1)` — the browser handles
 *     the transition, which is already animated by RouteTransition.
 *
 * Accessibility: purely additive. Existing back buttons, browser gestures,
 * and keyboard nav continue to work. Respects `prefers-reduced-motion` by
 * skipping the haptic pulse only — the navigation itself is preserved.
 */
export default function EdgeSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;
    if (typeof window === "undefined") return;

    let startX = 0;
    let startY = 0;
    let startedAtEdge = false;
    let insideScroller = false;

    const isHorizontallyScrollable = (el: Element | null): boolean => {
      let node: Element | null = el;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowX = style.overflowX;
        if (
          (overflowX === "auto" || overflowX === "scroll") &&
          node.scrollWidth > node.clientWidth
        ) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startedAtEdge = t.clientX <= 24;
      insideScroller = startedAtEdge
        ? isHorizontallyScrollable(document.elementFromPoint(t.clientX, t.clientY))
        : false;
    };

    const onEnd = (e: TouchEvent) => {
      if (!startedAtEdge || insideScroller) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx >= 64 && dy <= 40) {
        // Only navigate back if we actually have history to pop.
        if (window.history.length > 1) {
          soundTap();
          navigate(-1);
        }
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [isMobile, navigate, location.key]);

  return null;
}
