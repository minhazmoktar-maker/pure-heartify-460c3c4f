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
}

const TARGET = 100;
const MAX_FEED_PAGES = 6;

const CuratedSectionRow = ({ section }: Props) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  // Diversity context still supplies the per-channel cap. The global
  // seenVideoIds set is intentionally NOT applied here so each section can
  // independently reach 100 items even if adjacent sections share videos.
  const { perChannelCap } = useFeedDiversity();

  // In-section dedup + per-channel cap.
  const videos = useMemo(() => {
    const seen = new Set<string>();
    const perChannel = new Map<string, number>();
    const out: typeof rawVideos = [];
    for (const v of rawVideos) {
      if (seen.has(v.id)) continue;
      const key = (v.channelTitle || "unknown").toLowerCase().trim();
      const count = perChannel.get(key) ?? 0;
      if (count >= perChannelCap) continue;
      seen.add(v.id);
      perChannel.set(key, count + 1);
      out.push(v);
      if (out.length >= TARGET) break;
    }
    return out;
  }, [rawVideos, perChannelCap]);

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

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

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
