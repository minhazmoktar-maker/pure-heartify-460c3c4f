/**
 * useSmartSearch — talks to the server-side /search edge function which
 * combines Postgres full-text, pg_trgm typo tolerance, trust/recency/halal
 * boosting, and AI intent detection. Falls back gracefully if the endpoint
 * is unreachable so the UI never breaks.
 *
 * Architecture note: this hook is intentionally thin. The provider (Postgres
 * today, Meilisearch/Typesense/OpenSearch tomorrow) is chosen server-side
 * via SEARCH_PROVIDER env; the client contract does not change when we swap
 * backends. See docs/SEARCH.md for the ranking formula.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";


export interface SmartHit {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  category: string;
  halalScore: number;
  publishedAt: string;
  videoUrl: string;
  matchType: "fulltext" | "fuzzy" | "related" | "semantic" | "browse";
  score: number;
}

interface SearchResponse {
  hits: Array<{
    id: string;
    title: string;
    channelTitle: string;
    category: string;
    thumbnailUrl: string;
    halalScore: number;
    publishedAt: string;
    isTrustedChannel: boolean;
    rank: number;
    matchType: SmartHit["matchType"];
  }>;
  intent: {
    rewrittenQuery?: string;
    topic?: string;
    category?: string;
    channel?: string;
    entities?: string[];
  } | null;
  trending: Array<{ query: string; hits: number }>;
  related: Array<{ query: string; hits: number }>;
}

export function useSmartSearch(rawQuery: string) {
  const [debounced, setDebounced] = useState(rawQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(rawQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const { preferences } = useLocale();
  const contentLanguages = preferences.content_languages ?? [];
  const uiLanguage = preferences.ui_language ?? "en";
  const langKey = contentLanguages.join(",");

  const searchQ = useQuery({
    queryKey: ["smart-search", debounced, langKey, uiLanguage],
    enabled: debounced.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResponse> => {
      const { data, error } = await supabase.functions.invoke("search", {
        body: {
          q: debounced,
          limit: 60,
          useAi: true,
          content_languages: contentLanguages,
          ui_language: uiLanguage,
        },
      });
      if (error) throw error;
      return data as SearchResponse;
    },
  });
  const enriched: SmartHit[] = useMemo(
    () =>
      (searchQ.data?.hits ?? []).map((h) => ({
        id: h.id,
        title: h.title,
        channelTitle: h.channelTitle,
        thumbnailUrl: h.thumbnailUrl,
        category: h.category,
        halalScore: h.halalScore,
        publishedAt: h.publishedAt,
        videoUrl: `https://www.youtube.com/watch?v=${h.id}`,
        matchType: h.matchType,
        score: h.rank,
      })),
    [searchQ.data],
  );

  return {
    isLoading: searchQ.isLoading,
    results: enriched,
    intent: searchQ.data?.intent ?? null,
    didYouMean:
      searchQ.data?.intent?.rewrittenQuery &&
      searchQ.data.intent.rewrittenQuery.toLowerCase() !== debounced.toLowerCase()
        ? searchQ.data.intent.rewrittenQuery
        : null,
    trending: searchQ.data?.trending ?? [],
    related: searchQ.data?.related ?? [],
    autocomplete: [],
  };
}
