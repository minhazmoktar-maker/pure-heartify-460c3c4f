import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * useNavigationState — URL-backed state for filters, tabs, and query.
 *
 * The URL is the only trustworthy state store for anything that should
 * survive back/forward, refresh, or shareable links. This hook wraps
 * useSearchParams with a `replace` update (so filter changes don't
 * pollute the browser back stack) and JSON-safe (de)serialisation.
 *
 * Usage:
 *   const [category, setCategory] = useNavParam("cat", "all");
 *   const [range,    setRange]    = useNavParam("range", "week");
 *
 * setCategory("quran") produces  ?cat=quran  and does NOT push a history
 * entry — Back returns to the previous page as the user expects.
 */
export function useNavParam<T extends string>(
  key: string,
  defaultValue: T,
): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams();
  const value = (params.get(key) as T | null) ?? defaultValue;

  const set = useCallback(
    (next: T) => {
      const p = new URLSearchParams(params);
      if (next === defaultValue) p.delete(key);
      else p.set(key, next);
      setParams(p, { replace: true });
    },
    [params, setParams, key, defaultValue],
  );

  return [value, set];
}

/**
 * Multi-value variant for checkbox-style filters. Values are stored
 * comma-separated so URLs remain readable and shareable.
 */
export function useNavParamList(key: string): [string[], (next: string[]) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = raw ? raw.split(",").filter(Boolean) : [];

  const set = useCallback(
    (next: string[]) => {
      const p = new URLSearchParams(params);
      if (next.length === 0) p.delete(key);
      else p.set(key, next.join(","));
      setParams(p, { replace: true });
    },
    [params, setParams, key],
  );

  return [value, set];
}
