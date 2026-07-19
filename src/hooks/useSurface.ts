import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
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
export function useSurface(surface: SurfaceName, opts: { enabled?: boolean; kidsMode?: boolean } = {}): UseSurfaceResult {
  const { preferences } = useLocale();
  const contentLanguages = preferences.content_languages ?? [];
  const sessionId = getSessionId();
  const enabled = opts.enabled !== false;

  const q = useQuery<SurfaceResponse>({
    queryKey: ["surface", surface, contentLanguages.join(","), sessionId, opts.kidsMode ?? false],
    enabled,
    // Signed-in rails need to feel fresh across visits but not thrash on
    // each mount — 3 min stale is the sweet spot.
    staleTime: 3 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("surfaces", {
        body: {
          surface,
          session_id: sessionId,
          content_languages: contentLanguages,
          kids_mode: opts.kidsMode ?? false,
        },
      });
      if (error) throw new Error(error.message || `surface:${surface} failed`);
      return data as SurfaceResponse;
    },
  });

  return {
    items: (q.data?.items ?? []).map(toVideo),
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    meta: q.data?.meta ?? null,
    refetch: q.refetch,
    error: q.error,
  };
}
