import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import { useFeedDiversity } from "@/contexts/FeedDiversityContext";
import { runDedupedRefresh } from "@/lib/refreshMetrics";
import { useImpressionTracker } from "@/hooks/useImpressionTracker";

/**
 * Recently Added — newest videos approved into Heartify (moderation-passed).
 *
 * Uses the feed edge function with `sort: "recent"`, which orders by
 * `ingested_at` (i.e. when the video landed in curated_videos AFTER passing
 * moderation) — not by YouTube upload date, and not by any un-moderated
 * source.
 *
 * The feed function's "recent"-mode personalization block:
 *   - hard-filters blocked creators (blocked_creators + user_blocks),
 *   - drops user_hidden_videos + dismissed items via the -5.0 penalty,
 *   - keeps freshness dominant with a 1.6x anchor + dampened affinity.
 *
 * Caching: React Query with a 2 min staleTime (from useInfiniteFeed) + the
 * feed function's own 60s read-through cache for anon requests. Users can
 * pull-to-refresh via the refresh button.
 *
 * Infinite scroll on /section/recently-added; the home rail shows the first
 * ~40 with a "Show All" link.
 */
const RECENT_LIMIT = 40;

const RecentlyAddedRow = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const { perChannelCap } = useFeedDiversity();

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useInfiniteFeed({
    sort: "recent",
    limit: RECENT_LIMIT,
    enabled: shouldLoad,
  });

  // Lazy-mount on scroll — matches CuratedSectionRow's behavior.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || shouldLoad) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [shouldLoad]);

  const videos = useMemo(() => {
    const raw = (data?.pages ?? []).flatMap((p) => p.items);
    const seen = new Set<string>();
    const perChannel = new Map<string, number>();
    const out: typeof raw = [];
    for (const v of raw) {
      if (seen.has(v.id)) continue;
      const key = (v.channelTitle || "unknown").toLowerCase().trim();
      const n = perChannel.get(key) ?? 0;
      if (n >= perChannelCap) continue;
      seen.add(v.id);
      perChannel.set(key, n + 1);
      out.push(v);
    }
    return out;
  }, [data, perChannelCap]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (!shouldLoad || (isLoading && videos.length === 0)) {
    return (
      <section
        ref={sectionRef}
        className="py-6"
        data-section-id="recently-added"
        data-loading="true"
      >
        <h2 className="text-heading font-bold text-foreground">
          <Sparkles className="mr-1 inline h-4 w-4 text-primary" />
          Recently Added
        </h2>
        <div className="mt-3 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading fresh picks…</span>
        </div>
      </section>
    );
  }

  if (!videos.length) {
    return (
      <section
        ref={sectionRef}
        className="py-6 hidden"
        data-section-id="recently-added"
      />
    );
  }

  return (
    <section
      ref={sectionRef}
      className="py-6"
      data-section-id="recently-added"
      data-video-count={videos.length}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-heading font-bold text-foreground">
            <Sparkles className="mr-1 inline h-4 w-4 text-primary" />
            Recently Added
          </h2>
          <p className="mt-0.5 text-micro text-muted-foreground">
            The newest videos we've approved onto Heartify — personalized for you.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              void runDedupedRefresh("recently-added-row", async () => {
                try {
                  await refetch({ throwOnError: true });
                } catch (err) {
                  toast.error("Couldn't refresh Recently Added", {
                    description: err instanceof Error ? err.message : "Please try again.",
                    action: {
                      label: "Retry",
                      onClick: () => {
                        void runDedupedRefresh("recently-added-row", async () => { await refetch({ throwOnError: true }); });
                      },
                    },
                  });
                  throw err;
                }
              });
            }}
            disabled={isFetching}
            aria-label="Refresh Recently Added"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => navigate("/section/recently-added")}
            className="rounded-pill border border-border px-3 py-1 text-micro font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Show All
          </button>
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll Recently Added left"
            className="rounded-pill border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll Recently Added right"
            className="rounded-pill border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isFetching && videos.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Refreshing Recently Added…
        </div>
      )}

      <div
        ref={scrollRef}
        className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
      >
        {videos.map((video, i) => (
          <div
            key={video.id}
            className="w-[280px] shrink-0 sm:w-[300px]"
            data-video-id={video.id}
          >
            <YouTubeVideoCard video={video} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyAddedRow;
