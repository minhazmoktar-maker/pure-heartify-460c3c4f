import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type CuratedSection } from "@/data/curatedSections";
import { useCuratedSection } from "@/hooks/useCuratedSection";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import { isTrustedChannel } from "@/data/trustedChannels";
import { Badge } from "@/components/ui/badge";
import { useFeedDiversity } from "@/contexts/FeedDiversityContext";
import { useImpressionTracker } from "@/hooks/useImpressionTracker";

interface Props {
  section: CuratedSection;
  /**
   * If true, fetch immediately on mount instead of waiting for the row to
   * scroll near the viewport. Set for the first ~3 above-the-fold rows so
   * their feed requests fire in the same tick as React hydration — this
   * removes the ~1s IntersectionObserver delay measured as the dominant
   * "time-to-first-video" gap on cold Home loads.
   */
  priority?: boolean;
}

// Horizontal row shows ~4-6 cards at a time; 30 gives ~5x screens of scroll
// depth. Was 100 — that forced the feed edge function to overfetch 800 rows
// per section and run full personalization on 3.3x more data than any user
// would ever scroll to, multiplied by 33 sections on Home.
const TARGET = 30;
// Auto-paginate at most twice. Was 6 — the row rarely exhausts one page,
// so pages 3-6 were wasted round-trips that stole main-thread time from
// visible sections.
const MAX_FEED_PAGES = 2;

const CuratedSectionRow = ({ section, priority = false }: Props) => {
  const [shouldLoad, setShouldLoad] = useState(priority);

  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Diversity context: per-channel cap AND cross-section dedup. Sections
  // now share overlapping category pools (see feed edge function's
  // SECTION_CATEGORY_ALIASES), so without a cross-row seen set the same
  // Quran recitation could appear in 4 different rows. Row order = claim
  // order: earlier sections claim first, later sections filter them out.
  const { perChannelCap, claim, getSeenSnapshot, resetKey } = useFeedDiversity();

  // DB-backed feed (paginated). We fetch pages until we reach TARGET or run out.
  const {
    data: feedData,
    isLoading: feedLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteFeed({
    sectionId: section.id,
    limit: TARGET,
    enabled: shouldLoad,
    // Server-side dedup — never receive an id already claimed by an earlier rail.
    getExcludeIds: getSeenSnapshot,
  });

  const dbVideos = useMemo(
    () => (feedData?.pages ?? []).flatMap((p) => p.items),
    [feedData],
  );

  // Fall back to YouTube fetcher only if DB truly has nothing for this section.
  const useYouTubeFallback =
    shouldLoad && !feedLoading && dbVideos.length === 0 && !hasNextPage;

  const { data: ytVideos, isLoading: ytLoading } = useCuratedSection(
    section,
    useYouTubeFallback,
  );

  const rawVideos = dbVideos.length > 0 ? dbVideos : (ytVideos ?? []);


  // In-section dedup + per-channel cap + cross-section dedup via claim().
  const videos = useMemo(() => {
    const seenLocal = new Set<string>();
    const perChannel = new Map<string, number>();
    const out: typeof rawVideos = [];
    for (const v of rawVideos) {
      if (seenLocal.has(v.id)) continue;
      const key = (v.channelTitle || "unknown").toLowerCase().trim();
      const count = perChannel.get(key) ?? 0;
      if (count >= perChannelCap) continue;
      // claim() atomically checks & inserts into the session-persisted
      // seen-set and logs a dedup event if another rail already had it.
      if (!claim(v.id, `curated:${section.id}`)) continue;
      seenLocal.add(v.id);
      perChannel.set(key, count + 1);
      out.push(v);
      if (out.length >= TARGET) break;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawVideos, perChannelCap, resetKey, claim, section.id]);

  // Auto-paginate the DB feed until we hit TARGET or run out of pages.
  useEffect(() => {
    if (!shouldLoad) return;
    if (videos.length >= TARGET) return;
    if (!hasNextPage || isFetchingNextPage) return;
    const pagesLoaded = feedData?.pages?.length ?? 0;
    if (pagesLoaded >= MAX_FEED_PAGES) return;
    void fetchNextPage();
  }, [shouldLoad, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage, feedData]);

  const backfilling =
    shouldLoad &&
    videos.length < TARGET &&
    (isFetchingNextPage || (hasNextPage ?? false));

  const isLoading =
    feedLoading || (useYouTubeFallback && ytLoading) || backfilling;

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  // v3 impression tracking on visible cards inside the horizontal scroller.
  const { track } = useImpressionTracker(shouldLoad);
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || videos.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            const id = (e.target as HTMLElement).dataset.videoId;
            if (id) track(id);
          }
        }
      },
      { root, threshold: [0.5] },
    );
    root.querySelectorAll<HTMLElement>("[data-video-id]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [videos, track]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  // Horizontal infinite scroll — keep pulling pages as the rail is scrolled
  // right. The cross-rail seen-set is sent as exclude_ids, so later pages
  // can never repeat a video shown anywhere else on the page.
  useHorizontalInfiniteScroll(
    scrollRef,
    () => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); },
    shouldLoad && !!hasNextPage && !isFetchingNextPage,
  );


  if (!shouldLoad || (isLoading && videos.length === 0)) {
    return (
      <section
        ref={sectionRef}
        className="py-6"
        data-section-id={section.id}
        data-video-count={0}
        data-loading="true"
      >
        <h2 className="text-heading font-bold text-foreground">{section.icon} {section.title}</h2>
        <div className="mt-3 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </section>
    );
  }

  if (!videos?.length) {
    return (
      <section
        ref={sectionRef}
        className="py-6 hidden"
        data-section-id={section.id}
        data-video-count={0}
        data-loading="false"
      />
    );
  }

  return (
    <section
      ref={sectionRef}
      className="py-6"
      data-section-id={section.id}
      data-video-count={videos.length}
      data-loading={backfilling ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-heading font-bold text-foreground">{section.icon} {section.title}</h2>
          <p className="mt-0.5 text-micro text-muted-foreground">{section.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => navigate(`/section/${section.id}`)}
            className="rounded-pill border border-border px-3 py-1 text-micro font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Show All
          </button>
          <button onClick={() => scroll("left")} aria-label={`Scroll ${section.title} left`} className="rounded-pill border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll("right")} aria-label={`Scroll ${section.title} right`} className="rounded-pill border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="w-[280px] shrink-0 sm:w-[300px]"
            data-video-id={video.id}
          >
            <YouTubeVideoCard video={video} index={index} />
            {isTrustedChannel(video.channelTitle) && (
              <Badge variant="secondary" className="mt-1.5 gap-1 text-[10px]">
                <ShieldCheck className="h-3 w-3 text-primary" />
                Trusted Channel
              </Badge>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CuratedSectionRow;
