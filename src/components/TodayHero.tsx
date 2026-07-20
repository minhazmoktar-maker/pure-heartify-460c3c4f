import { lazy, Suspense } from "react";
import NextSalahWidget from "@/components/NextSalahWidget";
import { StreakCard } from "@/components/StreakCard";
import VerseOfDayCard from "@/components/VerseOfDayCard";

// DailyDoseHero owns the 3-thumbnail surface. Lazy so the streak + verse
// cards paint immediately even on cold cache.
const DailyDoseHero = lazy(() => import("@/components/DailyDoseHero"));

/**
 * The signed-in "Today shape" — one obvious next action per surface:
 *   Next salah countdown · Streak · Resume-reading verse · 3 daily-dose thumbnails.
 * Kept intentionally sparse so returning users see progress before anything else.
 */
/**
 * Compact "Right now" hero — one calm surface instead of four stacked cards.
 *   Row 1: Next salah countdown (primary above-the-fold action).
 *   Row 2: Streak + Verse of the day, side by side, quieter chrome.
 *   Row 3: 3 daily-dose thumbnails (lazy).
 */
const TodayHero = () => {
  return (
    <>
      <h1 className="sr-only">Heartify — your day: prayer, streak, verse, and daily dose</h1>
      <NextSalahWidget />
      <section
        className="mx-auto max-w-[1800px] px-4 pt-2 md:px-6"
        aria-label="Your day at a glance"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <StreakCard />
          <VerseOfDayCard />
        </div>
      </section>
      <Suspense fallback={null}>
        <DailyDoseHero />
      </Suspense>
    </>
  );
};

export default TodayHero;
