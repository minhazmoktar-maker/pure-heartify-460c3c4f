import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * A reciter row as returned by the `search_reciters` RPC.
 *
 * The RPC is defined in `supabase/migrations` and returns the columns below;
 * we type it explicitly so callers don't have to reach into the generated
 * `Database` type (which sometimes lags fresh migrations).
 */
export interface ReciterSearchResult {
  id: string;
  canonical_name_en: string;
  canonical_name_ar: string | null;
  country: string | null;
  primary_riwayah: string | null;
  image_url: string | null;
  popularity_score: number;
  is_living: boolean | null;
  match_type: "browse" | "alias" | "fulltext" | "fuzzy";
  rank: number;
}

interface UseReciterSearchState {
  results: ReciterSearchResult[];
  loading: boolean;
  error: string | null;
}

/**
 * Reactively query the reciters directory.
 *
 * - Empty query returns the top N by popularity ("browse" mode).
 * - Non-empty query hits the DB `search_reciters(query, limit)` RPC which
 *   combines full-text, trigram similarity, and alias-hit signals.
 * - Debounced by 200ms so keystrokes don't hammer the DB.
 */
export function useReciterSearch(query: string, limit = 12) {
  const [state, setState] = useState<UseReciterSearchState>({
    results: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { data, error } = await supabase.rpc("search_reciters", {
        _query: q,
        _limit: limit,
      });
      if (cancelled) return;
      if (error) {
        setState({ results: [], loading: false, error: error.message });
        return;
      }
      setState({
        results: (data ?? []) as ReciterSearchResult[],
        loading: false,
        error: null,
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, limit]);

  return state;
}
