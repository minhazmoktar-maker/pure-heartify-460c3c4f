import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * VideoCardSkeleton
 *
 * A pixel-matched shimmer for {@link YouTubeVideoCard}. The geometry mirrors
 * the real card exactly — 16:9 thumbnail, 36px circular avatar, two title
 * lines, one meta line — so that when the data arrives the layout doesn't
 * jump by a single pixel. No "Loading…" text: shape is the message.
 */
export default function VideoCardSkeleton({ className }: { className?: string }) {
  return (
    <article className={cn("group", className)} aria-hidden="true">
      <Skeleton className="aspect-video w-full rounded-card" />
      <div className="mt-3 flex gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-pill" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
    </article>
  );
}

/** Row-of-cards skeleton for horizontal carousel sections. */
export function VideoCardRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[240px] shrink-0 sm:w-[280px]">
          <VideoCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** Grid skeleton — matches the responsive columns used by feeds/search. */
export function VideoCardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}
