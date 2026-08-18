import { useEffect, useMemo, useRef } from "react";
import { Loader2, AlertTriangle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import { useInfiniteFeed, type FeedSort } from "@/hooks/useInfiniteFeed";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { HalalCategory } from "@/services/youtube";
import { useImpressionTracker } from "@/hooks/useImpressionTracker";
import { useFeedDiversity } from "@/contexts/FeedDiversityContext";

interface Props {
  category?: HalalCategory;
  sectionId?: string;
  search?: string;
  limit?: number;
  sort?: FeedSort;
  fallbackMessage?: string;
}

const InfiniteVideoGrid = ({
  category,
  sectionId,
  search,
  limit = 20,
  sort = "fresh",
  fallbackMessage = "No halal-compliant content found.",
}: Props) => {
  const { claim, getSeenSnapshot, resetKey } = useFeedDiversity();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteFeed({
    category,
    sectionId,
    search,
    limit,
    sort,
    // Server-side dedup: freshly-claimed ids from the rails above are
    // sent as exclude_ids on every page fetch so pagination can never
    // pull them back in.
    getExcludeIds: getSeenSnapshot,
  });

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    !!hasNextPage && !isFetchingNextPage,
  );

  const rawVideos = data?.pages.flatMap((p) => p.items) ?? [];
  const allVideos = useMemo(() => {
    const out: typeof rawVideos = [];
    for (const v of rawVideos) if (claim(v.id, "infinite_grid")) out.push(v);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawVideos, resetKey, claim]);
  const gridRef = useRef<HTMLDivElement>(null);
  const { track } = useImpressionTracker(!isLoading && !error);

  useEffect(() => {
    const root = gridRef.current;
    if (!root || allVideos.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const id = (entry.target as HTMLElement).dataset.videoId;
            if (id) track(id);
          }
        }
      },
      { threshold: [0.5] },
    );
    root.querySelectorAll<HTMLElement>("[data-video-id]").forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [allVideos, track]);

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-label="Loading halal content"
        role="status"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-video w-full rounded-card" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
        <span className="sr-only">Loading halal content…</span>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="muted"
        title="Couldn't load videos"
        description={(error as Error).message || "Please check your connection and try again."}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (allVideos.length === 0) {
    return (
      <EmptyState
        illustration="no-search-results"
        icon={Search}
        title="Nothing to show yet"
        description={fallbackMessage}
      />
    );
  }

  return (
    <>
      <div ref={gridRef} className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allVideos.map((video, i) => (
          <Fragment key={video.id}>
            {/* One-tap benefit label, in-feed after the first row. This is the
                ground-truth signal for the benefit ranker — placing it where
                attention already is lifts the response rate. */}
            {i === 4 && (
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <BenefitLabelPrompt />
              </div>
            )}
            <div data-video-id={video.id}>
              <YouTubeVideoCard video={video} index={i} />
            </div>
          </Fragment>
        ))}
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!hasNextPage && allVideos.length > 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          You've reached the end ✦
        </p>
      )}
    </>
  );
};

export default InfiniteVideoGrid;
