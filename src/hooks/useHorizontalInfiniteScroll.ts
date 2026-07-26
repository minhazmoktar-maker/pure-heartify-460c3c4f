import { useCallback, useEffect, useRef } from "react";

/**
 * Horizontal infinite scroll for rails.
 *
 * Attaches a passive scroll listener to a horizontally scrollable container
 * and calls `onEnd` when the user approaches the right edge (or the left edge
 * in RTL). Also fires once on mount / content change when the container isn't
 * actually overflowing yet, so a short first page still pulls the next one.
 */
export function useHorizontalInfiniteScroll<T extends HTMLElement>(
  ref: React.RefObject<T>,
  onEnd: () => void,
  enabled: boolean,
  thresholdPx = 600,
) {
  const cbRef = useRef(onEnd);
  cbRef.current = onEnd;

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // RTL containers report negative scrollLeft in some engines.
    const pos = Math.abs(el.scrollLeft);
    if (max - pos <= thresholdPx) cbRef.current();
  }, [ref, thresholdPx]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        check();
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // Initial check — covers the "content shorter than viewport" case.
    check();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, enabled, check]);

  return check;
}
