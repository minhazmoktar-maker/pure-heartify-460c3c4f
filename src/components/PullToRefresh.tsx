import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { runDedupedRefresh, isRefreshing } from "@/lib/refreshMetrics";

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
  /** Dedupe key — overlapping refreshes on the same key share one promise. */
  refreshKey?: string;
  /** Short label shown next to the spinner during refresh. */
  refreshingLabel?: string;
  className?: string;
}

/**
 * Native-feeling pull-to-refresh with dedupe, metrics, and error+retry.
 * - Touch-only (mobile widths OR coarse pointers, covers tablets/foldables).
 * - Activates only when scrollTop is 0, so it never fights infinite scroll.
 * - Rubber-band resistance + prefers-reduced-motion support.
 * - Overlapping pulls on the same key share one in-flight promise.
 * - Failed refreshes show a Sonner toast with a one-tap Retry action; scroll
 *   position is preserved because the tree never unmounts on refresh.
 */
export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 72,
  maxPull = 120,
  disabled,
  refreshKey = "default",
  refreshingLabel = "Refreshing…",
  className,
}: Props) {
  const isMobile = useIsMobile();
  const [coarse, setCoarse] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [errored, setErrored] = useState(false);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setCoarse(
      typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)").matches,
    );
  }, []);

  const enabled = (isMobile || coarse) && !disabled;

  const scrollTop = () =>
    document.scrollingElement?.scrollTop ??
    document.documentElement.scrollTop ??
    0;

  const runRefresh = useCallback(async () => {
    setRefreshing(true);
    setErrored(false);
    setPull(threshold);
    try {
      await runDedupedRefresh(refreshKey, async () => {
        await onRefresh();
      });
    } catch (err) {
      setErrored(true);
      const message = err instanceof Error ? err.message : "Refresh failed";
      toast.error("Couldn't refresh", {
        description: message,
        action: {
          label: "Retry",
          onClick: () => {
            // Scroll position is preserved automatically — the tree stays mounted.
            void runRefresh();
          },
        },
      });
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  }, [onRefresh, threshold, refreshKey]);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || refreshing || isRefreshing(refreshKey)) return;
      if (scrollTop() > 0) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    },
    [enabled, refreshing, refreshKey],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!active.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      if (scrollTop() > 0) {
        active.current = false;
        setPull(0);
        return;
      }
      const resisted = Math.min(maxPull, Math.sqrt(dy) * 8);
      setPull(resisted);
      if (resisted > 12 && e.cancelable) e.preventDefault();
    },
    [maxPull],
  );

  const onTouchEnd = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    startY.current = null;
    if (pull >= threshold && !refreshing) {
      void runRefresh();
    } else {
      setPull(0);
    }
  }, [pull, threshold, refreshing, runRefresh]);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, onTouchStart, onTouchMove, onTouchEnd]);

  const progress = Math.min(1, pull / threshold);
  const showIndicator = enabled && (pull > 0 || refreshing);

  return (
    <div ref={containerRef} className={className}>
      {showIndicator && (
        <div
          role={refreshing ? "status" : undefined}
          aria-live={refreshing ? "polite" : undefined}
          aria-hidden={!refreshing}
          className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
          style={{
            top: `calc(env(safe-area-inset-top, 0px) + 12px)`,
            transform: `translate(-50%, ${pull * 0.6 - 32}px)`,
            transition: refreshing || active.current ? "none" : "transform 200ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div
            className="flex items-center gap-2 rounded-pill bg-card px-3 py-2 shadow-lg ring-1 ring-border"
            style={{ opacity: Math.max(0.4, progress) }}
          >
            {errored ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : refreshing ? (
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
            {refreshing && (
              <span className="text-xs font-medium text-foreground">
                {refreshingLabel}
              </span>
            )}
          </div>
        </div>
      )}
      <div
        style={
          enabled && pull > 0 && !refreshing
            ? { transform: `translateY(${pull * 0.4}px)`, transition: "none", willChange: "transform" }
            : enabled
            ? { transform: "translateY(0)", transition: reduce.current ? "none" : "transform 200ms cubic-bezier(0.22,1,0.36,1)" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
