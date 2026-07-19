import { lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CuratedSectionRow from "@/components/CuratedSectionRow";
import SEO from "@/components/SEO";
import TodayHero from "@/components/TodayHero";
import WeeklyRecapCard from "@/components/WeeklyRecapCard";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import RamadanBanner from "@/components/RamadanBanner";
import FirstSessionCard from "@/components/FirstSessionCard";
import { useAuth } from "@/contexts/AuthContext";
import { CURATED_SECTIONS } from "@/data/curatedSections";
import { FeedDiversityProvider } from "@/contexts/FeedDiversityContext";

// Below-the-fold heavy modules stay lazy so mid-range phones don't parse
// framer-motion + audio player + infinite feed until they scroll into range.
const AudioPlayer = lazy(() => import("@/components/AudioPlayer"));
const RecentlyAddedRow = lazy(() => import("@/components/RecentlyAddedRow"));

const Index = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const onRefresh = async () => {
    await queryClient.invalidateQueries();
    toast.success("Feed refreshed");
  };

  const rails = (
    <FeedDiversityProvider>
      <main className="mx-auto max-w-[1800px] px-4 py-2 md:px-6">
        <Suspense fallback={null}>
          <RecentlyAddedRow />
        </Suspense>
        {CURATED_SECTIONS.map((section, i) => (
          <CuratedSectionRow key={section.id} section={section} priority={i < 3} />
        ))}
      </main>
    </FeedDiversityProvider>
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

            {rails}
          </>
        ) : (
          <>
            {/* Signed-out: content first, marketing below the fold. */}
            {rails}
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
