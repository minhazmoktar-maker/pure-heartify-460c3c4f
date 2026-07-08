import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type CuratedSection } from "@/data/curatedSections";
import { useCuratedSection } from "@/hooks/useCuratedSection";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import { isTrustedChannel } from "@/data/trustedChannels";
import { Badge } from "@/components/ui/badge";
import { useFeedDiversity } from "@/contexts/FeedDiversityContext";

interface Props {
  section: CuratedSection;
}

const CuratedSectionRow = ({ section }: Props) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Try DB-backed feed first
  const { data: feedData, isLoading: feedLoading } = useInfiniteFeed({
    sectionId: section.id,
    limit: section.maxResults,
    enabled: shouldLoad,
  });

  // Fallback to YouTube API if DB is empty
  const dbVideos = feedData?.pages?.[0]?.items ?? [];
  const useYouTubeFallback = shouldLoad && !feedLoading && dbVideos.length === 0;

  const { data: ytVideos, isLoading: ytLoading } = useCuratedSection(
    section,
    useYouTubeFallback,
  );

  const rawVideos = dbVideos.length > 0 ? dbVideos : (ytVideos ?? []);
  const { seenVideoIds, perChannelCap, resetKey } = useFeedDiversity();

  // Cross-section dedup + per-channel cap
  const perChannel = new Map<string, number>();
  const videos = rawVideos.filter((v) => {
    if (seenVideoIds.current.has(v.id)) return false;
    const key = (v.channelTitle || "unknown").toLowerCase().trim();
    const count = perChannel.get(key) ?? 0;
    if (count >= perChannelCap) return false;
    perChannel.set(key, count + 1);
    seenVideoIds.current.add(v.id);
    return true;
  });
  // resetKey triggers re-eval if user toggles diversity mode
  void resetKey;
  const isLoading = feedLoading || (useYouTubeFallback && ytLoading);

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

  if (!shouldLoad || isLoading) {
    return (
      <section ref={sectionRef} className="py-6">
        <h2 className="text-lg font-bold text-foreground">{section.icon} {section.title}</h2>
        <div className="mt-3 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </section>
    );
  }

  if (!videos?.length) return null;

  return (
    <section ref={sectionRef} className="py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{section.icon} {section.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{section.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => navigate(`/section/${section.id}`)}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Show All
          </button>
          <button onClick={() => scroll("left")} aria-label={`Scroll ${section.title} left`} className="rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll("right")} aria-label={`Scroll ${section.title} right`} className="rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
        {videos.map((video, index) => (
          <div key={video.id} className="w-[280px] shrink-0 sm:w-[300px]">
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
