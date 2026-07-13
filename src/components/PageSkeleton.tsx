import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  variant?: "default" | "list" | "grid" | "detail" | "feed";
  className?: string;
}

/**
 * Shared skeleton screen replacing per-page Loader2 spinners.
 * Preserves layout structure so route transitions don't jump.
 */
export default function PageSkeleton({
  variant = "default",
  className,
}: PageSkeletonProps) {
  return (
    <div
      className={cn(
        // Phase 10 — motion-matched: subtle fade-up + staggered children via
        // the shimmer class on each Skeleton (Tailwind's animate-pulse).
        "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6",
        "animate-in fade-in slide-in-from-bottom-1 duration-500",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      {/* Header row */}
      <div className="mb-6 flex items-center gap-3 border-b border-border/60 pb-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      {variant === "grid" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 p-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "feed" && (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="min-w-[180px] flex-1 space-y-2">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "detail" && (
        <div className="space-y-4">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      )}

      {variant === "default" && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}

      <span className="sr-only">Loading content…</span>
    </div>
  );
}
