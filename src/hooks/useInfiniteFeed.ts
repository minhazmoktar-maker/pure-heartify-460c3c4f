import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { YouTubeVideo, HalalCategory } from "@/services/youtube";
import { useLocale } from "@/contexts/LocaleContext";

interface FeedPage {
  items: YouTubeVideo[];
  nextCursor: string | null;
  total: number;
}

interface UseFeedOptions {
  category?: HalalCategory;
  sectionId?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

async function fetchFeedPage(opts: {
  category?: string;
  sectionId?: string;
  search?: string;
  cursor?: string;
  limit: number;
  contentLanguages: string[];
}): Promise<FeedPage> {
  const { data, error } = await supabase.functions.invoke("feed", {
    body: {
      category: opts.category,
      section_id: opts.sectionId,
      search: opts.search,
      cursor: opts.cursor,
      limit: opts.limit,
      content_languages: opts.contentLanguages,
    },
  });

  if (error) throw new Error(error.message || "Failed to fetch feed");

  return {
    items: data?.items ?? [],
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
}: UseFeedOptions = {}) {
  const { preferences } = useLocale();
  const contentLanguages = preferences.content_languages ?? [];
  const langKey = contentLanguages.join(",");

  return useInfiniteQuery<FeedPage>({
    queryKey: ["feed", category, sectionId, search, limit, langKey],
    queryFn: ({ pageParam }) =>
      fetchFeedPage({
        category: category === "All" ? undefined : category,
        sectionId,
        search,
        cursor: pageParam as string | undefined,
        limit,
        contentLanguages,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
