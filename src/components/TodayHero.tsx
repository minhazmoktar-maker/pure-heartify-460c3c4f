import { lazy, Suspense } from "react";
import NextSalahWidget from "@/components/NextSalahWidget";
import { StreakCard } from "@/components/StreakCard";
import VerseOfDayCard from "@/components/VerseOfDayCard";

// DailyDoseHero is large (interests, fetches, animations) — lazy so the
// four-up Today shape can paint immediately from the streak + verse cards.
const DailyDoseHero = lazy(() => import("@/components/DailyDoseHero"));

/**
 * The signed-in "Today shape" — one obvious next action per surface:
 *   Next salah · Streak · 3 daily-dose thumbnails · Resume-reading verse.
 * Duolingo-grade: every card is a single, glanceable commitment.
 */
const TodayHero = () => {
  return (
    <section className="mx-auto max-w-[1800px] px-4 pt-3 md:px-6" aria-label="Your day at a glance">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-1">
          <NextSalahWidget embedded />
        </div>
        <div className="md:col-span-1">
          <StreakCard />
        </div>
        <div className="md:col-span-1">
          <VerseOfDayCard />
        </div>
        <div className="md:col-span-1">
          <Suspense fallback={<div className="h-full min-h-40 rounded-card border border-border bg-card" />}>
            <DailyDoseHero compact />
          </Suspense>
        </div>
      </div>
    </section>
  );
};

export default TodayHero;
