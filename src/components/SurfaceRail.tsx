import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import VideoCardSkeleton from "@/components/VideoCardSkeleton";
import { useSurfaceInfinite, type SurfaceName } from "@/hooks/useSurface";
import { useHorizontalInfiniteScroll } from "@/hooks/useHorizontalInfiniteScroll";
import { useImpressionTracker } from "@/hooks/useImpressionTracker";
import { useFeedDiversity } from "@/contexts/FeedDiversityContext";
import { isClickbaitTitle } from "@/lib/clickbait";
import { cn } from "@/lib/utils";

interface Props {
  surface: SurfaceName;
  title: string;
  subtitle?: string;
  priority?: boolean;
  /** Hide the rail entirely when the surface returns no items (e.g. Continue Watching). */
  hideIfEmpty?: boolean;
  seeAllHref?: string;
}

function usePriorityGate(ref: React.RefObject<HTMLElement>, priority: boolean) {
  const [shouldLoad, setShouldLoad] = useState(priority);
  useEffect(() => {
    if (shouldLoad || !ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShouldLoad(true); io.disconnect(); } },
      { rootMargin: "200px 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, shouldLoad]);
  return shouldLoad;
}

/**
 * SurfaceRail — a horizontal rail bound to ONE independent surface.
 * No cross-rail dedup: the server guarantees per-surface diversity, and
 * different surfaces are meant to overlap only minimally (validated by
 * the pool-independence Jaccard metric).
 */
const SurfaceRail = ({
  surface, title, subtitle, priority = false, hideIfEmpty = false, seeAllHref,
}: Props) => {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldLoad = usePriorityGate(sectionRef, priority);

  const { claim, getSeenSnapshot, resetKey } = useFeedDiversity();
  const {
    items: rawItems, isLoading, meta,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useSurfaceInfinite(surface, {
    enabled: shouldLoad,
    // Server-side dedup: exclude ids already claimed by earlier rails so
    // the response can't contain them in the first place. Client-side
    // claim() below is the second line of defense.
    getExcludeIds: getSeenSnapshot,
  });
  const { track } = useImpressionTracker(true);

  // Horizontal infinite scroll — pull the next page as the user nears the
  // right edge of the rail.
  useHorizontalInfiniteScroll(
    scrollRef,
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    shouldLoad && hasNextPage && !isFetchingNextPage,
  );


  const items = useMemo(() => {
    const out: typeof rawItems = [];
    for (const v of rawItems) {
      if (isClickbaitTitle(v.title)) continue;
      if (claim(v.id, `surface:${surface}`)) out.push(v);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawItems, resetKey, claim, surface]);

  useEffect(() => {
    if (!items.length) return;
    for (const v of items.slice(0, 6)) track(v.id);
  }, [items, track]);

  if (hideIfEmpty && !isLoading && shouldLoad && items.length === 0) return null;

  const isEmpty = !isLoading && shouldLoad && items.length === 0;

  // Lazy placeholder: for rails past the fold that haven't been gated in yet,
  // reserve vertical space with a lightweight stub instead of mounting a full
  // skeleton row (6 skeleton cards × 11 rails is ~66 nodes at hydration).
  // The IntersectionObserver in usePriorityGate promotes this to the full rail
  // as it approaches the viewport.
  if (!shouldLoad) {
    return (
      <section
        ref={sectionRef}
        aria-label={title}
        className="pt-6"
        data-surface={surface}
        data-lazy="pending"
      >
        <div className="mb-2 px-1">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div
          aria-hidden
          className="h-[180px] rounded-lg bg-surface-1/40 md:h-[210px]"
        />
      </section>
    );
  }

  const scrollBy = (dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  // Editorial hierarchy — "For you" and "Continue watching" are hero rails
  // (larger, bolder). Everything else uses a quieter secondary size so the
  // page reads like an edited magazine, not a wall of same-weight titles.
  const isHero = surface === "for_you" || surface === "continue_watching";
  const titleCls = isHero
    ? "font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl"
    : "font-sans text-lg font-semibold tracking-tight text-foreground md:text-xl";
  return (
    <section ref={sectionRef} className="pt-6" aria-label={title}>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <div>
          <h2 className={titleCls}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {seeAllHref && (
            <Link to={seeAllHref} className="mr-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              See all
            </Link>
          )}
          <button aria-label="Scroll left" onClick={() => scrollBy(-600)}
            className="rounded-full border border-border bg-surface-1 p-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button aria-label="Scroll right" onClick={() => scrollBy(600)}
            className="rounded-full border border-border bg-surface-1 p-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3",
          "scrollbar-none scroll-smooth [scroll-padding-inline:1rem]",
        )}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[240px] shrink-0 snap-start md:w-[280px]">
                <VideoCardSkeleton />
              </div>
            ))
          : isEmpty ? (
              <div className="mx-1 flex w-full items-center gap-4 rounded-card border border-dashed border-border bg-card/40 px-5 py-6">
                <div className="shrink-0 rounded-pill bg-primary/10 p-3">
                  <span aria-hidden className="block h-6 w-6 rounded-pill bg-primary/40" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Nothing here yet</p>
                  <p className="text-micro text-muted-foreground">
                    New content lands here as our moderators approve it. Pull to refresh or check back soon.
                  </p>
                </div>
              </div>
            ) : items.map((v, i) => (
              <div key={v.id} className="w-[240px] shrink-0 snap-start md:w-[280px]">
                <YouTubeVideoCard video={v} index={i} />
              </div>
            ))}
        {(isLoading || isFetchingNextPage) && (
          <div className="flex w-[80px] shrink-0 items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

      </div>
      {/* Rec-health telemetry is admin-only and lives at /admin/rec-health.
          Never rendered on user-facing surfaces — no engineering artifacts, ever. */}
    </section>
  );
};

export default SurfaceRail;
