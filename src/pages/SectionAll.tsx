import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Suspense, lazy } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import PageSkeleton from "@/components/PageSkeleton";
import PullToRefresh from "@/components/PullToRefresh";
import { CURATED_SECTIONS } from "@/data/curatedSections";
import { useCuratedSection } from "@/hooks/useCuratedSection";
import { isTrustedChannel } from "@/data/trustedChannels";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

const InfiniteVideoGrid = lazy(() => import("@/components/InfiniteVideoGrid"));

const SectionAll = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onRefresh = async () => {
    await queryClient.invalidateQueries();
    toast.success("Refreshed");
  };

  // "Recently Added" is a synthetic section backed by the feed function's
  // `sort: "recent"` mode (newest moderation-approved videos, personalized).
  // Rendered via InfiniteVideoGrid so it supports true infinite scroll,
  // caching, and the personalization/dismissal/blocked-creator pipeline.
  if (sectionId === "recently-added") {
    return (
      <PullToRefresh onRefresh={onRefresh} disabled={typeof navigator !== "undefined" && !navigator.onLine}>
      <div className="min-h-dvh bg-background pb-12">
        <SEO
          title="Recently Added — Heartify"
          description="The newest videos we've approved onto Heartify — personalized for you, always halal-first."
          path="/section/recently-added"
        />
        <Navbar />
        <div className="mx-auto max-w-[1800px] px-4 py-6 md:px-6">
          <button
            onClick={() => navigate("/")}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to For You
          </button>
          <div className="mb-6">
            <h1 className="text-title font-bold text-foreground">
              <Sparkles className="mr-1 inline h-5 w-5 text-primary" />
              Recently Added
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The newest videos we've approved onto Heartify — personalized for you.
            </p>
          </div>
          <Suspense fallback={<PageSkeleton variant="grid" className="max-w-none px-0" />}>
            <InfiniteVideoGrid sort="recent" limit={40} />
          </Suspense>
        </div>
        </div>
      </PullToRefresh>
    );
  }

  const section = CURATED_SECTIONS.find((s) => s.id === sectionId);

  // Create an expanded version of the section with more results
  const expandedSection = section
    ? { ...section, maxResults: 60 }
    : null;

  const { data: rawVideos, isLoading } = useCuratedSection(expandedSection!, !!expandedSection);

  // Cap to max 3 videos per channel for variety
  const MAX_PER_CHANNEL = 3;
  const perChannel = new Map<string, number>();
  const videos = rawVideos?.filter((v) => {
    const key = (v.channelTitle || "unknown").toLowerCase().trim();
    const count = perChannel.get(key) ?? 0;
    if (count >= MAX_PER_CHANNEL) return false;
    perChannel.set(key, count + 1);
    return true;
  });

  if (!section) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="py-20 text-center">
          <p className="text-heading font-medium text-muted-foreground">Section not found.</p>
        </div>
      </div>
    );
  }


  return (
    <PullToRefresh onRefresh={onRefresh} disabled={typeof navigator !== "undefined" && !navigator.onLine}>
    <div className="min-h-dvh bg-background pb-12">
      <SEO title="Browse Section — Heartify" description="Explore curated halal videos and audio across every section on Heartify." path="/section" />
      <Navbar />

      <div className="mx-auto max-w-[1800px] px-4 py-6 md:px-6">
        <button
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to For You
        </button>

        <div className="mb-6">
          <h1 className="text-title font-bold text-foreground">
            {section.icon} {section.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        </div>

        {isLoading && (
          <PageSkeleton variant="grid" className="max-w-none px-0" />
        )}

        {!isLoading && videos && (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v, i) => (
              <div key={v.id}>
                <YouTubeVideoCard video={v} index={i} />
                {isTrustedChannel(v.channelTitle) && (
                  <Badge variant="secondary" className="mt-1.5 gap-1 text-[10px]">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    Trusted Channel
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && videos?.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-heading font-medium text-muted-foreground">No content found for this section.</p>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
};

export default SectionAll;
