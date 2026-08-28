import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Calls `onIntersect` whenever the sentinel element comes near the viewport.
 *
 * Two details matter for a feed that must never feel like it ended early:
 *
 * 1. The observer is attached via a ref callback and is NOT rebuilt when the
 *    `enabled` gate flips (it flips on every page fetch). Rebuilding it meant
 *    that when the sentinel was already inside the root margin as the new page
 *    landed, no fresh `isIntersecting` transition ever fired — the feed stalled
 *    until the viewer scrolled again, which read as "endless scroll is broken".
 *    The ref callback also matters because the sentinel mounts only after the
 *    first page renders, so a mount-time effect would find no node at all.
 * 2. A post-page re-check runs after each load, so a page shorter than the
 *    viewport (heavily deduped batches often are) immediately pulls the next
 *    one instead of leaving a dead sentinel on screen.
 */
export function useInfiniteScroll(onIntersect: () => void, enabled: boolean) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  // Latest callback + gate, read at fire time so the observer never needs to be
  // torn down and rebuilt.
  const cb = useRef(onIntersect);
  cb.current = onIntersect;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const visibleRef = useRef(false);

  const sentinelRef = useCallback((el: HTMLDivElement | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node) return;

    const fire = () => {
      if (enabledRef.current && visibleRef.current) cb.current();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        fire();
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(node);

    // Sentinel height/position can change without an intersection transition
    // (new page appended above it, images resolving, orientation change).
    const resize = new ResizeObserver(() => fire());
    resize.observe(document.documentElement);

    return () => {
      observer.disconnect();
      resize.disconnect();
      visibleRef.current = false;
    };
  }, [node]);

  // When a fetch settles and the sentinel is still in view, keep going.
  useEffect(() => {
    if (!enabled || !visibleRef.current) return;
    const id = requestAnimationFrame(() => {
      if (enabledRef.current && visibleRef.current) cb.current();
    });
    return () => cancelAnimationFrame(id);
  }, [enabled]);

  return sentinelRef;
}
