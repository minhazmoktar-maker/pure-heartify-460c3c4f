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
      {/* 16:9 thumbnail — matches YouTubeVideoCard's aspect-video rounded-card */}
      <Skeleton className="aspect-video w-full rounded-card" />

      {/* Meta block — mirrors `mt-3 flex gap-3` exactly */}
      <div className="mt-3 flex gap-3">
        {/* 36px avatar circle */}
        <Skeleton className="h-9 w-9 shrink-0 rounded-pill" />
        <div className="min-w-0 flex-1">
          {/* Title: 2 lines of text-sm leading-snug (~19.25px each).
              Using h-[14px] bars + 5px gap = 19px rhythm, matching the real
              line-box so the switch to real text produces zero vertical jump. */}
          <Skeleton className="h-[14px] w-11/12 rounded-sm" />
          <Skeleton className="mt-[5px] h-[14px] w-3/5 rounded-sm" />
          {/* Meta: two text-micro lines (channel + timeAgo), separated by
              the same mt-1 the real card uses. */}
          <Skeleton className="mt-2 h-3 w-2/5 rounded-sm" />
          <Skeleton className="mt-1 h-3 w-1/4 rounded-sm" />
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
