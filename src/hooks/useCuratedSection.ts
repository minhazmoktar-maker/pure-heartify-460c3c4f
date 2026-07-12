import { useQuery } from "@tanstack/react-query";
import { fetchHalalVideos, type YouTubeVideo } from "@/services/youtube";
import { type CuratedSection } from "@/data/curatedSections";
import { isTrustedChannel } from "@/data/trustedChannels";
import { ADJACENT_QUERIES, GENERIC_HALAL_QUERIES } from "@/data/adjacentQueries";

/**
 * Fetch halal videos for a curated section, backfilling from adjacent queries
 * until we reach `desiredCount` (defaults to section.maxResults).
 *
 * Strategy:
 * 1. Walk every section.queries entry (no artificial 1/3 budget).
 * 2. If still short, walk ADJACENT_QUERIES[section.id] with the section's minScore.
 * 3. If still short, walk GENERIC_HALAL_QUERIES with a relaxed floor (minScore - 10).
 */
export function useCuratedSection(section?: CuratedSection | null, enabled = true) {
  return useQuery<YouTubeVideo[]>({
    queryKey: ["curated", section?.id ?? "missing", section?.maxResults ?? 0],
    enabled: !!section && enabled,
    queryFn: async () => {
      if (!section) return [];

      const target = section.maxResults;
      const results: YouTubeVideo[] = [];
      const seen = new Set<string>();

      const ingest = (videos: YouTubeVideo[], minScore: number) => {
        for (const v of videos) {
          if (results.length >= target) return;
          if (seen.has(v.id)) continue;
          if (v.halalScore < minScore) continue;
          seen.add(v.id);
          results.push(v);
        }
      };

      // Overfetch each query so a narrow topic can still contribute a lot.
      const perQuery = Math.max(25, Math.ceil(target / Math.max(section.queries.length, 1)));

      // 1) Section-native queries.
      for (const q of section.queries) {
        if (results.length >= target) break;
        const videos = await fetchHalalVideos(q, perQuery);
        ingest(videos, section.minScore);
      }

      // 2) Adjacent-topic backfill (still respects section.minScore).
      if (results.length < target) {
        const adjacent = ADJACENT_QUERIES[section.id] ?? [];
        for (const q of adjacent) {
          if (results.length >= target) break;
          const videos = await fetchHalalVideos(q, 50);
          ingest(videos, section.minScore);
        }
      }

      // 3) Generic halal backfill with a slightly relaxed floor.
      if (results.length < target) {
        const relaxed = Math.max(0, section.minScore - 10);
        for (const q of GENERIC_HALAL_QUERIES) {
          if (results.length >= target) break;
          const videos = await fetchHalalVideos(q, 50);
          ingest(videos, relaxed);
        }
      }

      return results
        .sort((a, b) => {
          const aTrust = isTrustedChannel(a.channelTitle) ? 1 : 0;
          const bTrust = isTrustedChannel(b.channelTitle) ? 1 : 0;
          if (bTrust !== aTrust) return bTrust - aTrust;
          return b.halalScore - a.halalScore;
        })
        .slice(0, target);
    },
    staleTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
