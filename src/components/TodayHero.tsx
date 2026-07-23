import { lazy, Suspense, useEffect, useMemo } from "react";
import NextSalahWidget from "@/components/NextSalahWidget";
import { StreakCard } from "@/components/StreakCard";
import VerseOfDayCard from "@/components/VerseOfDayCard";
import { useAuth } from "@/contexts/AuthContext";

// DailyDoseHero owns the 3-thumbnail surface. Lazy so the streak + verse
// cards paint immediately even on cold cache.
const DailyDoseHero = lazy(() => import("@/components/DailyDoseHero"));

function firstName(email?: string | null): string | null {
  if (!email) return null;
  const raw = email.split("@")[0] ?? "";
  const clean = raw.replace(/[._-]+/g, " ").trim();
  if (!clean) return null;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * The signed-in "Today shape" — one obvious next action per surface:
 *   Salaam · Next salah countdown · Streak · Verse · Daily dose.
 * Personal frame answers "why open this app?" in one glance.
 */
const TodayHero = () => {
  const { user } = useAuth();
  const name = useMemo(
    () => (user?.user_metadata?.full_name as string | undefined) ?? firstName(user?.email),
    [user],
  );
  // Prewarm the /today offline cache so returning users have a fully
  // populated Today screen even if they lose connectivity mid-session.
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const run = () => { void import("@/pages/Today").then((m) => m.loadDaily?.()).catch(() => {}); };
    if (idle) idle(run); else window.setTimeout(run, 1200);
  }, []);
  return (
    <>
      
      {user && (
        <section
          className="mx-auto mt-2 max-w-[1800px] px-4 md:px-6"
          aria-label="Greeting"
        >
          <p className="text-sm text-muted-foreground">
            <span lang="ar" dir="rtl" className="font-quran text-foreground">السلام عليكم</span>
            {name ? <> · <span className="text-foreground">{name}</span></> : null}
          </p>
        </section>
      )}
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
