import { lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SEO from "@/components/SEO";
import TodayHero from "@/components/TodayHero";
import WeeklyRecapCard from "@/components/WeeklyRecapCard";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import RamadanBanner from "@/components/RamadanBanner";
import FirstSessionCard from "@/components/FirstSessionCard";
import { useAuth } from "@/contexts/AuthContext";
import SurfaceRail from "@/components/SurfaceRail";

const AudioPlayer = lazy(() => import("@/components/AudioPlayer"));
const InfiniteVideoGrid = lazy(() => import("@/components/InfiniteVideoGrid"));

const Index = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const onRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["surface"] });
    toast.success("Feed refreshed");
  };

  // Signed-in home: 11 independent surfaces, ordered by expected daily value.
  const signedInRails = (
    <main className="mx-auto max-w-[1800px] space-y-1 px-4 py-2 md:px-6">
      <SurfaceRail surface="continue_watching" title="Continue watching"
        subtitle="Pick up where you left off" hideIfEmpty priority />
      <SurfaceRail surface="for_you" title="For you"
        subtitle="Personalised to what you love" priority />
      <SurfaceRail surface="recently_added" title="Recently added"
        subtitle="Freshly approved on Heartify" priority
        seeAllHref="/section/recently-added" />
      <SurfaceRail surface="because_you_watched" title="Because you watched"
        subtitle="More like your recent watches" hideIfEmpty />
      <SurfaceRail surface="trending" title="Trending"
        subtitle="Rising this week across Heartify" />
      <SurfaceRail surface="listen" title="Listen"
        subtitle="Recitation, adhan, nasheed and lectures" />
      <SurfaceRail surface="new_videos" title="New uploads"
        subtitle="Just published by trusted creators" />
      <SurfaceRail surface="popular_this_week" title="Popular this week" />
      <SurfaceRail surface="hidden_gems" title="Hidden gems"
        subtitle="Overlooked, high-trust videos" />
      <SurfaceRail surface="new_channels" title="New channels"
        subtitle="Recently welcomed to Heartify" />
      <SurfaceRail surface="browse" title="Browse"
        subtitle="A slice across every category" />
    </main>
  );

  // Signed-out home: public surfaces only, in a discovery-friendly order.
  const signedOutRails = (
    <main className="mx-auto max-w-[1800px] space-y-1 px-4 py-2 md:px-6">
      <SurfaceRail surface="trending" title="Trending" priority />
      <SurfaceRail surface="recently_added" title="Recently added" priority
        seeAllHref="/section/recently-added" />
      <SurfaceRail surface="listen" title="Listen"
        subtitle="Recitation, adhan, nasheed and lectures" priority />
      <SurfaceRail surface="new_videos" title="New uploads" />
      <SurfaceRail surface="popular_this_week" title="Popular this week" />
      <SurfaceRail surface="hidden_gems" title="Hidden gems" />
      <SurfaceRail surface="browse" title="Browse" />
    </main>
  );


  return (
    <PullToRefresh
      onRefresh={onRefresh}
      refreshKey="home"
      refreshingLabel="Refreshing your feed…"
      disabled={typeof navigator !== "undefined" && !navigator.onLine}
    >
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

        {user ? (
          <>
            {/* Signed-in Today shape: next salah · streak · verse · daily dose */}
            <TodayHero />

            <div className="mx-auto max-w-[1800px] space-y-3 px-4 pt-3 md:px-6">
              <StreakAtRiskBanner />
              <RamadanBanner />
              <FirstSessionCard />
              <WeeklyRecapCard />
            </div>

            {signedInRails}
          </>
        ) : (
          <>
            {/* Signed-out: content first, marketing below the fold. */}
            {signedOutRails}
            <HeroSection />
          </>
        )}

        <footer className="border-t border-border bg-card py-8">
          <div className="mx-auto max-w-[1800px] px-4 text-center md:px-6 space-y-2">
            <p className="text-sm text-muted-foreground">© 2026 Heartify — Curated halal content for the Ummah ✦</p>
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
