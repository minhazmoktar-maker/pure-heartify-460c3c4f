// Given the current video and a pool of candidate videos (typically the
// halal feed), return the ordered list of sibling episodes that belong to the
// same series. Ordering: ascending by episode number, then by publishedAt.
//
// Pure and memoized — safe to call on every render.

import { useMemo } from "react";
import type { YouTubeVideo } from "@/services/youtube";
import { detectSeries, seriesKey } from "@/lib/seriesDetect";

export interface SeriesEpisode {
  video: YouTubeVideo;
  episode: number;
}

export interface SeriesResult {
  base: string;
  episode: number;
  episodes: SeriesEpisode[];
  currentIndex: number;
  next: YouTubeVideo | null;
  previous: YouTubeVideo | null;
}

export function useSeriesEpisodes(
  current: YouTubeVideo | undefined,
  pool: YouTubeVideo[] | undefined,
): SeriesResult | null {
  return useMemo(() => {
    if (!current || !pool?.length) return null;
    const currentSeries = detectSeries(current.title);
    if (!currentSeries) return null;
    const key = seriesKey(current.channelTitle, currentSeries.base);

    const matches: SeriesEpisode[] = [];
    for (const v of pool) {
      const s = detectSeries(v.title);
      if (!s) continue;
      if (seriesKey(v.channelTitle, s.base) !== key) continue;
      matches.push({ video: v, episode: s.episode });
    }
    // Deduplicate by video id (feed sometimes surfaces the same video twice).
    const seen = new Set<string>();
    const unique = matches.filter(({ video }) => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    });
    if (unique.length < 2) return null;

    unique.sort((a, b) => {
      if (a.episode !== b.episode) return a.episode - b.episode;
      const at = new Date(a.video.publishedAt || 0).getTime();
      const bt = new Date(b.video.publishedAt || 0).getTime();
      return at - bt;
    });

    const currentIndex = unique.findIndex(({ video }) => video.id === current.id);
    const next = currentIndex >= 0 && currentIndex < unique.length - 1 ? unique[currentIndex + 1].video : null;
    const previous = currentIndex > 0 ? unique[currentIndex - 1].video : null;

    return {
      base: currentSeries.base,
      episode: currentSeries.episode,
      episodes: unique,
      currentIndex,
      next,
      previous,
    };
  }, [current, pool]);
}
