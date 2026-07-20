import { lazy, Suspense, useState } from "react";
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
import HomeHero from "@/components/HomeHero";

const AudioPlayer = lazy(() => import("@/components/AudioPlayer"));
const InfiniteVideoGrid = lazy(() => import("@/components/InfiniteVideoGrid"));

const Index = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showMoreRails, setShowMoreRails] = useState(false);

  const onRefresh = async () => {
    // Clear cross-rail dedup so the refreshed pages can re-claim ids.
    try {
      const mod = await import("@/contexts/FeedDiversityContext");
      // best-effort: dispatch storage-style change to force a resetKey bump
      window.dispatchEvent(new CustomEvent("heartify:showMoreChannels:change", {
        detail: mod ? (localStorage.getItem("heartify:showMoreChannels") === "1") : false,
      }));
    } catch { /* noop */ }
    await queryClient.invalidateQueries({ queryKey: ["surface"] });
    await queryClient.invalidateQueries({ queryKey: ["feed"] });
    toast.success("Feed refreshed");
  };

  // Home is intentionally sparse: 5 top rails above the fold.
  // Secondary rails collapse behind one "Show more" affordance so the
  // first impression isn't an 11-rail wall of scaffolding.
  const signedInPrimary = (
    <main className="mx-auto max-w-[1800px] space-y-1 px-4 py-2 md:px-6">
      <SurfaceRail surface="continue_watching" title="Continue watching"
        subtitle="Pick up where you left off" hideIfEmpty priority />
      <SurfaceRail surface="for_you" title="For you"
        subtitle="Personalised to what you love" priority />
      <SurfaceRail surface="recently_added" title="Recently added"
        subtitle="Freshly approved on Heartify" priority
        seeAllHref="/section/recently-added" />
      <SurfaceRail surface="trending" title="Trending"
        subtitle="Rising this week across Heartify" />
      <SurfaceRail surface="listen" title="Listen"
        subtitle="Recitation, adhan, nasheed and lectures" />
    </main>
  );

  const signedInSecondary = (
    <main className="mx-auto max-w-[1800px] space-y-1 px-4 pb-2 md:px-6">
      <SurfaceRail surface="because_you_watched" title="Because you watched"
        subtitle="More like your recent watches" hideIfEmpty />
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

  const signedOutPrimary = (
    <main className="mx-auto max-w-[1800px] space-y-1 px-4 py-2 md:px-6">
      <SurfaceRail surface="trending" title="Trending" priority />
      <SurfaceRail surface="recently_added" title="Recently added" priority
        seeAllHref="/section/recently-added" />
      <SurfaceRail surface="listen" title="Listen"
        subtitle="Recitation, adhan, nasheed and lectures" priority />
    </main>
  );

  const signedOutSecondary = (
    <main className="mx-auto max-w-[1800px] space-y-1 px-4 pb-2 md:px-6">
      <SurfaceRail surface="new_videos" title="New uploads" />
      <SurfaceRail surface="popular_this_week" title="Popular this week" />
      <SurfaceRail surface="hidden_gems" title="Hidden gems" />
      <SurfaceRail surface="browse" title="Browse" />
    </main>
  );

  const showMoreButton = (
    <div className="mx-auto max-w-[1800px] px-4 pt-2 md:px-6">
      <button
        onClick={() => setShowMoreRails(true)}
        className="w-full rounded-card border border-border bg-card px-4 py-3 text-caption font-semibold text-foreground shadow-e1 transition-colors hover:bg-secondary"
      >
        Show more rails
      </button>
    </div>
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
            {/* One collapsed hero — greeting + next salah + today's ayah
                stacked in a single card; resume-in-1-tap overrides it when
                a continue-watching item exists. Search pill lives on top. */}
            <HomeHero />
            <TodayHero />

            <div className="mx-auto max-w-[1800px] space-y-3 px-4 pt-3 md:px-6">
              <StreakAtRiskBanner />
              <RamadanBanner />
              <FirstSessionCard />
              <WeeklyRecapCard />
            </div>

            {signedInPrimary}
            {showMoreRails ? signedInSecondary : showMoreButton}

            <section aria-label="Keep exploring" className="mx-auto max-w-[1800px] px-4 pt-6 md:px-6">
              <h2 className="text-title font-semibold mb-3">Keep exploring</h2>
              <Suspense fallback={null}>
                <InfiniteVideoGrid sort="recent" limit={24} />
              </Suspense>
            </section>
          </>
        ) : (
          <>
            {/* Signed-out collapsed hero — same one-card shape, no resume.
                Sign-in nudge lives inside the primary rails block below. */}
            <HomeHero />
            <p className="mx-auto mt-2 max-w-[1800px] px-4 text-center text-caption text-muted-foreground md:px-6">
              <a href="/login" className="underline underline-offset-2 hover:text-foreground">
                Sign in
              </a>{" "}
              to save your streak and pick up where you left off.
            </p>


            {signedOutPrimary}
            {showMoreRails ? signedOutSecondary : showMoreButton}

            <section aria-label="Keep exploring" className="mx-auto max-w-[1800px] px-4 pt-6 md:px-6">
              <h2 className="text-title font-semibold mb-3">Keep exploring</h2>
              <Suspense fallback={null}>
                <InfiniteVideoGrid sort="recent" limit={24} />
              </Suspense>
            </section>

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
