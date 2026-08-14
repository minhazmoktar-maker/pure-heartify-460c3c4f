/**
 * Per-language corpus coverage (how much live content exists in each
 * content language). Powers the language picker so users can see, before
 * committing, whether their language has depth — and so a thin selection
 * can be flagged instead of silently producing a near-empty feed.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LanguageCoverage {
  language: string;
  live_videos: number;
  live_channels: number;
}

/** Below this, a language cannot fill a feed on its own. */
export const THIN_LANGUAGE_THRESHOLD = 500;

export function useLanguageCoverage() {
  const query = useQuery({
    queryKey: ["language-coverage"],
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async (): Promise<Record<string, LanguageCoverage>> => {
      const { data, error } = await supabase
        .from("language_corpus_health")
        .select("language, live_videos, live_channels");
      if (error) throw error;
      const map: Record<string, LanguageCoverage> = {};
      for (const row of (data ?? []) as LanguageCoverage[]) {
        if (!row.language) continue;
        map[row.language.toLowerCase()] = row;
      }
      return map;
    },
  });

  const coverage = query.data ?? {};

  const videosFor = (code: string): number =>
    coverage[code.toLowerCase()]?.live_videos ?? 0;

  /** Total supply across the user's selected languages. */
  const supplyFor = (codes: readonly string[]): number =>
    codes.reduce((sum, c) => sum + videosFor(c), 0);

  return { coverage, videosFor, supplyFor, isLoading: query.isLoading };
}

/** "12.4k" / "820" — compact, locale-neutral. */
export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}
