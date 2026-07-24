import { useEffect } from "react";
import DailyDoseHero from "@/components/DailyDoseHero";
import NextSalahWidget from "@/components/NextSalahWidget";
import { StreakCard } from "@/components/StreakCard";
import VerseOfDayCard from "@/components/VerseOfDayCard";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The signed-in "Today shape" — one obvious next action per surface.
 * Sprint 2: Daily Dose is now the HERO of the personal frame. It paints
 * eagerly (no lazy delay) so returning users see today's session on first
 * frame. Salah countdown + streak/verse cards sit beneath as supporting
 * context, not as the primary CTA.
 */
const TodayHero = () => {
  const { user } = useAuth();

  // Prewarm /today offline cache in idle time.
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const run = () => { void import("@/pages/Today").then((m) => m.loadDaily?.()).catch(() => {}); };
    if (idle) idle(run); else window.setTimeout(run, 1200);
  }, []);

  return (
    <>
      {/* HERO: Today's Daily Dose — the primary reason to open the app */}
      {user ? <DailyDoseHero /> : null}

      {/* Next salah — supporting context */}
      <NextSalahWidget />

      {/* Streak + verse — the daily rituals */}
      <section
        className="mx-auto max-w-[1800px] px-4 pt-2 md:px-6"
        aria-label="Your day at a glance"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <StreakCard />
          <VerseOfDayCard />
        </div>
      </section>
    </>
  );
};

export default TodayHero;
