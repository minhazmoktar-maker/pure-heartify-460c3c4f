import { useMemo, useRef } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { getRecentTopics } from "@/lib/recentTopics";
import { getDeviceClass } from "@/lib/deviceSignals";
import { filterHalal } from "@/lib/halalGuard";
import type { YouTubeVideo, HalalCategory } from "@/services/youtube";

export type SurfaceName =
  | "for_you" | "browse" | "listen"
  | "recently_added" | "trending" | "continue_watching"
  | "hidden_gems" | "new_channels" | "new_videos"
  | "because_you_watched" | "popular_this_week";

interface SurfaceResponseItem {
  video_id: string;
  title: string;
  channel_id: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  category: string | null;
  published_at: string | null;
  ingested_at: string | null;
  halal_score: number | null;
  content_language: string | null;
  /** Wave M2 — reason chip returned by pool_beneficial_v1. */
  reason?: string | null;
  benefit_score?: number | null;
}

interface SurfaceResponse {
  surface: SurfaceName;
  items: SurfaceResponseItem[];
  meta: {
    took_ms: number;
    pool_size: number;
    guarantees: Record<string, boolean>;
    stats: {
      distinctChannels: number;
      distinctCategories: number;
      distinctLanguages: number;
      topLanguageShare: number;
      freshShare: number;
    };
  };
}

function toVideo(r: SurfaceResponseItem): YouTubeVideo {
  return {
    id: r.video_id,
    title: r.title,
    videoUrl: `https://www.youtube.com/watch?v=${r.video_id}`,
    thumbnailUrl: r.thumbnail_url ?? `https://i.ytimg.com/vi/${r.video_id}/hqdefault.jpg`,
    channelTitle: r.channel_title ?? "",
    category: ((r.category as HalalCategory) ?? "All"),
    halalScore: r.halal_score ?? 90,
    publishedAt: r.published_at ?? r.ingested_at ?? new Date().toISOString(),
    reason: r.reason ?? null,
  };
}

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const KEY = "heartify.session_id";
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const s = (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
      ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, s);
    return s;
  } catch {
    return `t-${Date.now()}`;
  }
}

export interface UseSurfaceResult {
  items: YouTubeVideo[];
  isLoading: boolean;
  isFetching: boolean;
  meta: SurfaceResponse["meta"] | null;
  refetch: () => Promise<unknown>;
  error: unknown;
}

/**
 * useSurface — one hook, one independent surface. Never shares a candidate
 * pool with any other rail: the edge function routes to a dedicated
 * retriever with its own SQL and contract.
 */
export function useSurface(
  surface: SurfaceName,
  opts: {
    enabled?: boolean;
    kidsMode?: boolean;
    /**
     * Optional accessor for the current cross-rail seen-set. Called at
     * request time (NOT part of the query key) so the server can drop
     * already-claimed ids before they ever reach the wire. Client-side
     * dedup remains as belt-and-suspenders.
     */
    getExcludeIds?: () => string[];
  } = {},
): UseSurfaceResult {
  const { preferences } = useLocale();
  const contentLanguages = preferences.content_languages ?? [];
  const diversityLevel = preferences.diversity_level ?? 50;
  const uiLanguage = preferences.ui_language;
  const strictHalal = preferences.strict_halal !== false;
  const sessionId = getSessionId();
  const enabled = opts.enabled !== false;

  const q = useQuery<SurfaceResponse>({
    queryKey: ["surface", surface, contentLanguages.join(","), sessionId, opts.kidsMode ?? false, diversityLevel, uiLanguage, strictHalal],
    enabled,
    // Signed-in rails need to feel fresh across visits but not thrash on
    // each mount — 3 min stale is the sweet spot.
    staleTime: 3 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    queryFn: async () => {
      // Cap exclude payload to keep request body small (~64 KB max).
      const excludeIds = (opts.getExcludeIds?.() ?? []).slice(-1500);
      const { data, error } = await supabase.functions.invoke("surfaces", {
        body: {
          surface,
          session_id: sessionId,
          content_languages: contentLanguages,
          kids_mode: opts.kidsMode ?? false,
          strict_halal: strictHalal,
          exclude_ids: excludeIds,
          // Personalization + cold-start signals.
          diversity_level: diversityLevel,
          ui_language: uiLanguage,
          device_class: getDeviceClass(),
          recent_topics: getRecentTopics(),
        },
      });
      if (error) throw new Error(error.message || `surface:${surface} failed`);
      return data as SurfaceResponse;
    },
  });

  return {
    items: filterHalal((q.data?.items ?? []).map(toVideo), strictHalal),
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    meta: q.data?.meta ?? null,
    refetch: q.refetch,
    error: q.error,
  };
}

export interface UseSurfaceInfiniteResult extends UseSurfaceResult {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

/** Hard stop so a rail can never loop forever against a small pool. */
const MAX_SURFACE_PAGES = 8;

/**
 * useSurfaceInfinite — same contract as `useSurface`, but paginated for
 * horizontally infinite rails.
 *
 * The surfaces function has no offset param (each retriever returns a fresh
 * ranked pool), so pagination works by *exclusion*: every subsequent request
 * sends the ids this rail already rendered — plus the cross-rail seen-set —
 * as `exclude_ids`, so the server can only answer with videos the user has
 * not seen anywhere in the session. That gives infinite scroll and dedup
 * with a single mechanism.
 */
export function useSurfaceInfinite(
  surface: SurfaceName,
  opts: {
    enabled?: boolean;
    kidsMode?: boolean;
    getExcludeIds?: () => string[];
  } = {},
): UseSurfaceInfiniteResult {
  const { preferences } = useLocale();
  const contentLanguages = preferences.content_languages ?? [];
  const diversityLevel = preferences.diversity_level ?? 50;
  const uiLanguage = preferences.ui_language;
  const sessionId = getSessionId();
  const enabled = opts.enabled !== false;
  // Ids this rail itself has already rendered. Not part of the query key —
  // read at request time only.
  const strictHalal = preferences.strict_halal !== false;
  const railSeen = useRef<Set<string>>(new Set());

  const q = useInfiniteQuery<SurfaceResponse>({
    queryKey: ["surface-infinite", surface, contentLanguages.join(","), sessionId, opts.kidsMode ?? false, diversityLevel, uiLanguage, strictHalal],
    enabled,
    staleTime: 3 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      if (all.length >= MAX_SURFACE_PAGES) return undefined;
      if (!last?.items?.length) return undefined;
      return all.length;
    },
    queryFn: async ({ pageParam }) => {
      const globalExclude = opts.getExcludeIds?.() ?? [];
      const merged = new Set<string>([...globalExclude, ...railSeen.current]);
      const excludeIds = Array.from(merged).slice(-1500);
      const { data, error } = await supabase.functions.invoke("surfaces", {
        body: {
          surface,
          session_id: sessionId,
          content_languages: contentLanguages,
          kids_mode: opts.kidsMode ?? false,
          strict_halal: strictHalal,
          exclude_ids: excludeIds,
          page: pageParam,
          diversity_level: diversityLevel,
          ui_language: uiLanguage,
          device_class: getDeviceClass(),
          recent_topics: getRecentTopics(),
        },
      });
      if (error) throw new Error(error.message || `surface:${surface} failed`);
      const resp = data as SurfaceResponse;
      for (const it of resp?.items ?? []) railSeen.current.add(it.video_id);
      return resp;
    },
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: YouTubeVideo[] = [];
    for (const page of q.data?.pages ?? []) {
      for (const r of page?.items ?? []) {
        if (seen.has(r.video_id)) continue;
        seen.add(r.video_id);
        out.push(toVideo(r));
      }
    }
    return filterHalal(out, strictHalal);
  }, [q.data, strictHalal]);

  return {
    items,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    meta: q.data?.pages?.[0]?.meta ?? null,
    refetch: q.refetch,
    error: q.error,
    fetchNextPage: () => { void q.fetchNextPage(); },
    hasNextPage: !!q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
  };
}
