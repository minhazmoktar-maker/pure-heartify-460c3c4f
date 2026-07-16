import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * ScrollRestoration — preserves scroll position across in-app navigation.
 *
 * Behavior:
 *   - PUSH (new page): scroll to top.
 *   - POP  (back/forward): restore the previous scroll position for that
 *     history entry.
 *   - REPLACE: leave scroll alone (filters, tabs, query-param changes).
 *
 * Works alongside the browser's native scrollRestoration by disabling it
 * on mount so behavior is deterministic across engines. Positions are
 * cached per key (pathname + search) in sessionStorage so a hard refresh
 * still remembers where you were.
 */
const STORAGE_KEY = "heartify.scroll-positions.v1";

function loadCache(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveCache(cache: Record<string, number>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked — silently degrade to no persistence.
  }
}

export default function ScrollRestoration() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
  }, []);

  // Save scroll on unload / route change so history back returns to it.
  useEffect(() => {
    const key = `${pathname}${search}`;

    // Persist the scroll of the PREVIOUS route before switching to the new one.
    if (lastKey.current && lastKey.current !== key) {
      const cache = loadCache();
      cache[lastKey.current] = window.scrollY;
      saveCache(cache);
    }
    lastKey.current = key;

    // If the URL has a #hash, defer to the browser / target element so
    // deep links (Privacy TOC, /quotes#patience, etc.) land on the section.
    if (hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) el.scrollIntoView({ block: "start" });
      });
    } else if (navType === "POP") {
      const cache = loadCache();
      const y = cache[key] ?? 0;
      // Wait a frame so the incoming page has laid out.
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
    } else if (navType === "PUSH") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    // REPLACE: intentionally no-op — preserves position when filters/query
    // params change on the same page.
  }, [pathname, search, hash, navType]);

  // Also flush on tab hide so refreshes preserve position.
  useEffect(() => {
    const onHide = () => {
      const cache = loadCache();
      cache[`${pathname}${search}`] = window.scrollY;
      saveCache(cache);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [pathname, search]);

  return null;
}
