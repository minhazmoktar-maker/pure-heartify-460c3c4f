import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { HalalCategory } from "@/services/youtube";

interface Props {
  category?: HalalCategory;
  sectionId?: string;
  search?: string;
  limit?: number;
  fallbackMessage?: string;
}

const InfiniteVideoGrid = ({
  category,
  sectionId,
  search,
  limit = 20,
  fallbackMessage = "No halal-compliant content found.",
}: Props) => {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteFeed({ category, sectionId, search, limit });

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    !!hasNextPage && !isFetchingNextPage,
  );

  const allVideos = data?.pages.flatMap((p) => p.items) ?? [];

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
      <div className="py-20 text-center">
        <p className="text-heading font-medium text-destructive">Failed to load videos.</p>
        <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  if (allVideos.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-heading font-medium text-muted-foreground">{fallbackMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allVideos.map((video, i) => (
          <YouTubeVideoCard key={video.id} video={video} index={i} />
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
