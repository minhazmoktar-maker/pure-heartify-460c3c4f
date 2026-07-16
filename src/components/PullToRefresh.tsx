import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  /** Called when the user completes a pull. Must return a promise. */
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
  /** Pull distance in px required to trigger. Default 72. */
  threshold?: number;
  /** Maximum pull travel (with resistance). Default 120. */
  maxPull?: number;
  /** Force disable (e.g. offline). */
  disabled?: boolean;
  className?: string;
}

/**
 * Native-feeling pull-to-refresh.
 * - Touch-only, mobile-only (`useIsMobile`).
 * - Activates only when the document scrollTop is 0 at the start of the gesture,
 *   so it never fights infinite scroll or inner scrollers.
 * - Applies rubber-band resistance and respects prefers-reduced-motion.
 * - Passes through vertical scrolls that are not "pull down from top".
 */
export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 72,
  maxPull = 120,
  disabled,
  className,
}: Props) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const scrollTop = () =>
    document.scrollingElement?.scrollTop ??
    document.documentElement.scrollTop ??
    0;

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || refreshing) return;
      if (scrollTop() > 0) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    },
    [disabled, refreshing],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!active.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // If page scrolled while dragging (e.g. content grew), bail.
      if (scrollTop() > 0) {
        active.current = false;
        setPull(0);
        return;
      }
      // Rubber-band: sqrt-based resistance so it never exceeds maxPull.
      const resisted = Math.min(maxPull, Math.sqrt(dy) * 8);
      setPull(resisted);
      if (resisted > 12 && e.cancelable) e.preventDefault();
    },
    [maxPull],
  );

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    setPull(threshold);
    try {
      await onRefresh();
    } catch {
      /* swallowed — caller shows its own toast */
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  }, [onRefresh, threshold]);

  const onTouchEnd = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    startY.current = null;
    if (pull >= threshold && !refreshing) {
      void doRefresh();
    } else {
      setPull(0);
    }
  }, [pull, threshold, refreshing, doRefresh]);

  useEffect(() => {
    if (!isMobile || disabled) return;
    const opts: AddEventListenerOptions = { passive: false };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, opts);
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isMobile, disabled, onTouchStart, onTouchMove, onTouchEnd]);

  const progress = Math.min(1, pull / threshold);
  const showIndicator = isMobile && (pull > 0 || refreshing);

  return (
    <div ref={containerRef} className={className}>
      {showIndicator && (
        <div
          aria-hidden={!refreshing}
          role={refreshing ? "status" : undefined}
          className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
          style={{
            top: `calc(env(safe-area-inset-top, 0px) + 12px)`,
            transform: `translate(-50%, ${pull * 0.6 - 32}px)`,
            transition: refreshing || active.current ? "none" : "transform 200ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-border"
            style={{ opacity: Math.max(0.4, progress) }}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <ArrowDown
                className="h-4 w-4 text-primary"
                style={{
                  transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
                  transition: reduce.current ? "none" : "transform 150ms ease-out",
                }}
              />
            )}
          </div>
        </div>
      )}
      <div
        style={
          isMobile && pull > 0 && !refreshing
            ? { transform: `translateY(${pull * 0.4}px)`, transition: "none", willChange: "transform" }
            : isMobile
            ? { transform: "translateY(0)", transition: reduce.current ? "none" : "transform 200ms cubic-bezier(0.22,1,0.36,1)" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
