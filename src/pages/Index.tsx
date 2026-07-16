import { useState, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import { toast } from "sonner";
import { Video, Headphones, Sparkles, Shuffle, TrendingUp, Clock, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HalalCategoryFilter from "@/components/HalalCategoryFilter";
import CuratedSectionRow from "@/components/CuratedSectionRow";
import DailyDoseHero from "@/components/DailyDoseHero";
import SEO from "@/components/SEO";
import NextSalahWidget from "@/components/NextSalahWidget";
import StreakCard from "@/components/StreakCard";
import WeeklyRecapCard from "@/components/WeeklyRecapCard";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import RamadanBanner from "@/components/RamadanBanner";
import FirstSessionCard from "@/components/FirstSessionCard";
import { useAuth } from "@/contexts/AuthContext";
import { type HalalCategory } from "@/services/youtube";
import { CURATED_SECTIONS } from "@/data/curatedSections";
import { FeedDiversityProvider, useFeedDiversity } from "@/contexts/FeedDiversityContext";
import type { FeedSort } from "@/hooks/useInfiniteFeed";
import { cn } from "@/lib/utils";

// Tab-conditional / below-the-fold — kept out of the initial main bundle so
// mid-range Android phones don't parse framer-motion + audio player + infinite
// feed code paths until the user actually switches to Browse/Listen.
const AudioSection = lazy(() => import("@/components/AudioSection"));
const AudioPlayer = lazy(() => import("@/components/AudioPlayer"));
const InfiniteVideoGrid = lazy(() => import("@/components/InfiniteVideoGrid"));
const RecentlyAddedRow = lazy(() => import("@/components/RecentlyAddedRow"));

const DiversityToggle = () => {
  const { showMoreChannels, toggleShowMoreChannels } = useFeedDiversity();
  return (
    <button
      onClick={toggleShowMoreChannels}
      className={cn(
        "mb-2 mt-2 inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-micro font-medium transition-colors",
        showMoreChannels
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      <Shuffle className="h-3.5 w-3.5" />
      {showMoreChannels ? "Showing more channels" : "Show more channels"}
    </button>
  );
};

type MainTab = "videos" | "listen" | "curated";

const Index = () => {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>("curated");
  const [selectedCategory, setSelectedCategory] = useState<HalalCategory>("All");
  const [browseSort, setBrowseSort] = useState<FeedSort>("fresh");
  const queryClient = useQueryClient();

  const onRefresh = async () => {
    await queryClient.invalidateQueries();
    toast.success("Feed refreshed");
  };

  return (
    <PullToRefresh onRefresh={onRefresh} disabled={typeof navigator !== "undefined" && !navigator.onLine}>
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title="Heartify — Curated Halal Video & Audio App"
        description="Discover curated halal videos and audio from trusted creators. Distraction-free, family-friendly, and moderated for a mindful experience."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Heartify",
          url: "https://pure-heartify.lovable.app/",
          description:
            "Curated halal video and audio app with trusted creators and moderated content.",
          potentialAction: {
            "@type": "SearchAction",
            target:
              "https://pure-heartify.lovable.app/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Navbar />
      <HeroSection />

      <NextSalahWidget />
      <RamadanBanner />
      <FirstSessionCard />


      {user && (
        <div className="mx-auto max-w-[1800px] space-y-3 px-4 pt-2 md:px-6">
          <StreakAtRiskBanner />
          <div className="grid gap-3 md:grid-cols-2">
            <StreakCard />
            <WeeklyRecapCard />
          </div>
        </div>
      )}



      <DailyDoseHero />



      {/* Main tabs */}
      <div className="sticky top-16 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center gap-0 px-4 md:px-6">
          <button
            onClick={() => setMainTab("curated")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors",
              mainTab === "curated"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-4 w-4" />
            For You
          </button>
          <button
            onClick={() => setMainTab("videos")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors",
              mainTab === "videos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Video className="h-4 w-4" />
            Browse
          </button>
          <button
            onClick={() => setMainTab("listen")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors",
              mainTab === "listen"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Headphones className="h-4 w-4" />
            Listen
          </button>
        </div>
      </div>

      {/* Curated "For You" tab */}
      {mainTab === "curated" && (
        <FeedDiversityProvider>
          <main className="mx-auto max-w-[1800px] px-4 py-2 md:px-6">
            <DiversityToggle />
            <Suspense fallback={null}>
              <RecentlyAddedRow />
            </Suspense>
            {CURATED_SECTIONS.map((section) => (
              <CuratedSectionRow key={section.id} section={section} />
            ))}
          </main>
        </FeedDiversityProvider>
      )}

      {mainTab === "videos" && (
        <>
          <HalalCategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
          <div className="mx-auto flex max-w-[1800px] flex-wrap gap-2 px-4 pt-3 md:px-6" role="tablist" aria-label="Sort videos">
            {([
              { id: "fresh", label: "Fresh", icon: Zap },
              { id: "trending", label: "Trending", icon: TrendingUp },
              { id: "recent", label: "New Uploads", icon: Clock },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={browseSort === id}
                onClick={() => setBrowseSort(id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors",
                  browseSort === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-6">
            <Suspense fallback={null}>
              <InfiniteVideoGrid category={selectedCategory} sort={browseSort} />
            </Suspense>
          </main>
        </>
      )}

      {mainTab === "listen" && (
        <Suspense fallback={null}>
          <AudioSection />
        </Suspense>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-[1800px] px-4 text-center md:px-6 space-y-2">
          <p className="text-sm text-muted-foreground">© 2026 HalalTube — Curated halal content for the Ummah ✦</p>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-micro text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground underline">Privacy</a>
            <a href="/terms" className="hover:text-foreground underline">Terms</a>
            <a href="/trust" className="hover:text-foreground underline">Trust &amp; Security</a>
            <a href="/status" className="hover:text-foreground underline">System Status</a>
            <a href="/about" className="hover:text-foreground underline">About</a>
          </nav>
        </div>
      </footer>

      <Suspense fallback={null}><AudioPlayer /></Suspense>
    </div>
    </PullToRefresh>
  );
};

export default Index;
