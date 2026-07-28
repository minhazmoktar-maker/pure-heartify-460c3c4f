import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { filterHalal } from "@/lib/halalGuard";
import type { YouTubeVideo, HalalCategory } from "@/services/youtube";
import { useLocale } from "@/contexts/LocaleContext";

interface FeedPage {
  items: YouTubeVideo[];
  nextCursor: string | null;
  total: number;
}

export type FeedSort = "fresh" | "trending" | "recent";

interface UseFeedOptions {
  category?: HalalCategory;
  sectionId?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
  sort?: FeedSort;
  /**
   * Optional accessor for the current cross-rail seen-set. Called at
   * request time (NOT part of the query key) so the server can drop
   * already-claimed ids before they ever reach the wire. This makes
   * server-side dedup work across pagination — every fetchNextPage()
   * excludes everything the rails and previous pages have shown.
   */
  getExcludeIds?: () => string[];
  /**
   * Extra cache-key discriminator. Use when the same category feed must not
   * share a cache entry between contexts (e.g. the Related rail on Watch is
   * keyed by the video being watched, so two different videos never render
   * the identical related list from cache).
   */
  keySuffix?: string;
}

/**
 * Per-tab session id. Kept in sessionStorage so it survives in-tab
 * navigation (rerender, route change, refresh) but is fresh on every new
 * tab or cold app open — this is the key that makes each session's feed
 * fundamentally different rather than merely re-jittered.
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const KEY = "heartify.session_id";
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const s =
      (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, s);
    return s;
  } catch {
    return `t-${Date.now()}`;
  }
}

async function fetchFeedPage(opts: {
  category?: string;
  sectionId?: string;
  search?: string;
  cursor?: string;
  limit: number;
  contentLanguages: string[];
  sort?: FeedSort;
  sessionId: string;
  excludeIds: string[];
  strictHalal: boolean;
}): Promise<FeedPage> {
  const { data, error } = await supabase.functions.invoke("feed", {
    body: {
      category: opts.category,
      section_id: opts.sectionId,
      search: opts.search,
      cursor: opts.cursor,
      limit: opts.limit,
      content_languages: opts.contentLanguages,
      sort: opts.sort,
      session_id: opts.sessionId,
      exclude_ids: opts.excludeIds,
      strict_halal: opts.strictHalal,
    },
  });

  if (error) throw new Error(error.message || "Failed to fetch feed");

  return {
    items: filterHalal((data?.items ?? []) as YouTubeVideo[], opts.strictHalal),
    nextCursor: data?.nextCursor ?? null,
    total: data?.total ?? 0,
  };
}

export function useInfiniteFeed({
  category,
  sectionId,
  search,
  limit = 20,
  enabled = true,
  sort = "fresh",
  getExcludeIds,
  keySuffix,
}: UseFeedOptions = {}) {
  const { preferences } = useLocale();
  const contentLanguages = preferences.content_languages ?? [];
  const langKey = contentLanguages.join(",");
  const sessionId = getSessionId();
  const strictHalal = preferences.strict_halal !== false;

  return useInfiniteQuery<FeedPage>({
    queryKey: ["feed", category, sectionId, search, limit, langKey, sort, sessionId, keySuffix ?? "", strictHalal],
    queryFn: ({ pageParam }) =>
      fetchFeedPage({
        category: category === "All" ? undefined : category,
        sectionId,
        search,
        cursor: pageParam as string | undefined,
        limit,
        contentLanguages,
        sort,
        sessionId,
        // Snapshot at fetch time — deliberately NOT in queryKey so cache
        // stays warm; server dedup is a defense-in-depth layer.
        excludeIds: (getExcludeIds?.() ?? []).slice(-1500),
        strictHalal,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled,
    // 20 min stale + 45 min gc: returning to Home hydrates instantly from
    // the RQ cache instead of re-invoking the (~600-800ms) feed function
    // for every one of the 33 curated rows.
    staleTime: 20 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
