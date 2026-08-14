import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, RefreshCw, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ChallengeAward, { medalTierForPoints } from "@/components/ChallengeAward";

type Challenge = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: () => number;
  link: string;
  points: number;
  category: "daily" | "weekly";
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Snapshot storage — persist yesterday's baselines so we can compute daily deltas
const BASELINE_KEY = "heartify.challenges.baseline.v1";
type Baseline = { date: string; dhikrTotal: number; salahDone: number; adhkarDone: number; surahsRead: number };

function readBaseline(): Baseline {
  try { return JSON.parse(localStorage.getItem(BASELINE_KEY) || "null") || null; } catch { return null as any; }
}
function writeBaseline(b: Baseline) { localStorage.setItem(BASELINE_KEY, JSON.stringify(b)); }

function todayStats() {
  const today = iso(new Date());

  // Dhikr lifetime
  let dhikrTotal = 0;
  try { dhikrTotal = JSON.parse(localStorage.getItem("heartify.dhikr.v1") || "{}").lifetime || 0; } catch {}

  // Salah today count (any status counts as "prayed")
  let salahDone = 0;
  try {
    const raw = JSON.parse(localStorage.getItem("heartify.salah.tracker.v1") || "{}");
    const rec = raw[today] || {};
    for (const p of ["fajr","dhuhr","asr","maghrib","isha"]) if (rec[p] && rec[p] !== "none") salahDone++;
  } catch {}

  // Adhkar completed today (heuristic: count if any progress today)
  let adhkarDone = 0;
  try {
    const raw = JSON.parse(localStorage.getItem("heartify.adhkar.v1") || "{}");
    if (raw?.date === today) adhkarDone = raw.completed || 0;
  } catch {}

  // Surahs read lifetime
  let surahsRead = 0;
  try { surahsRead = (JSON.parse(localStorage.getItem("heartify.quran.progress.v1") || "{}").completed || []).length; } catch {}

  return { dhikrTotal, salahDone, adhkarDone, surahsRead };
}

export default function Challenges() {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  // Ensure baseline for today exists
  useEffect(() => {
    const today = iso(new Date());
    const b = readBaseline();
    const s = todayStats();
    if (!b || b.date !== today) {
      writeBaseline({ date: today, dhikrTotal: s.dhikrTotal, salahDone: 0, adhkarDone: 0, surahsRead: s.surahsRead });
    }
  }, []);

  const { dailyChallenges, weeklyChallenges, totalPoints, earnedPoints } = useMemo(() => {
    const s = todayStats();
    const b = readBaseline() || { date: iso(new Date()), dhikrTotal: s.dhikrTotal, salahDone: 0, adhkarDone: 0, surahsRead: s.surahsRead };

    const dhikrToday = Math.max(0, s.dhikrTotal - b.dhikrTotal);
    const surahsToday = Math.max(0, s.surahsRead - b.surahsRead);

    const daily: Challenge[] = [
      { id: "d-salah-5", title: "Pray all 5 today", description: "Mark all five prayers in the Salah tracker.", target: 5, progress: () => s.salahDone, link: "/salah", points: 50, category: "daily" },
      { id: "d-dhikr-100", title: "100 dhikr", description: "Recite any dhikr 100 times today.", target: 100, progress: () => dhikrToday, link: "/dhikr", points: 20, category: "daily" },
      { id: "d-adhkar", title: "Morning or evening adhkar", description: "Complete at least one adhkar item today.", target: 1, progress: () => (s.adhkarDone > 0 ? 1 : 0), link: "/adhkar", points: 30, category: "daily" },
      { id: "d-surah", title: "Read one surah", description: "Open and mark one surah complete.", target: 1, progress: () => Math.min(1, surahsToday), link: "/quran", points: 30, category: "daily" },
    ];

    const weekly: Challenge[] = [
      { id: "w-dhikr-1k", title: "1,000 weekly dhikr", description: "Total 1,000 dhikr across the week.", target: 1000, progress: () => dhikrToday, link: "/dhikr", points: 100, category: "weekly" },
      { id: "w-salah-25", title: "25 prayers this week", description: "Log 25 prayers in the tracker.", target: 25, progress: () => Math.min(25, s.salahDone * 7), link: "/salah", points: 150, category: "weekly" },
      { id: "w-3-surahs", title: "Read 3 surahs", description: "Complete 3 surahs across the week.", target: 3, progress: () => Math.min(3, surahsToday), link: "/quran", points: 100, category: "weekly" },
    ];

    const all = [...daily, ...weekly];
    const totalPoints = all.reduce((sum, c) => sum + c.points, 0);
    const earnedPoints = all.reduce((sum, c) => sum + (c.progress() >= c.target ? c.points : 0), 0);
    return { dailyChallenges: daily, weeklyChallenges: weekly, totalPoints, earnedPoints };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const renderCard = (c: Challenge) => {
    const cur = c.progress();
    const done = cur >= c.target;
    const pct = Math.min(100, Math.round((cur / c.target) * 100));
    return (
      <Card key={c.id} className={`h-full transition ${done ? "border-emerald-500/50 bg-emerald-500/5" : "hover:border-primary/60"}`}>
        <Link to={c.link} aria-label={`${c.title} — open related page`} className="block">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Target className="h-5 w-5 text-primary" />}
              <CardTitle className="text-base">{c.title}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px]">+{c.points} pts</Badge>
          </CardHeader>
        </Link>
        <CardContent className="space-y-2">
          <Link to={c.link} className="block space-y-2" aria-label={`${c.title} — open related page`}>
            <p className="text-micro text-muted-foreground">{c.description}</p>
            <Progress value={pct} className="h-2" />
            <p className="text-right text-micro font-mono">{cur.toLocaleString()} / {c.target.toLocaleString()}</p>
          </Link>
          {done && (
            <ChallengeAward
              title={c.title}
              tier={medalTierForPoints(c.points)}
              note={`${c.category === "daily" ? "Daily" : "Weekly"} challenge — ${c.points} points`}
            />
          )}
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Daily Challenges — Heartify" description="Daily and weekly challenges for salah, dhikr, Quran, and adhkar. Earn points and build momentum." path="/challenges" />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-title font-bold"><Target className="h-7 w-7 text-primary" />Daily Challenges</h1>
            <p className="mt-1 text-muted-foreground">Fresh goals every day. Complete them for points and streak momentum.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-pill border bg-card px-4 py-2 text-sm">
              <Trophy className="mr-1 inline h-4 w-4 text-yellow-500" />
              <span className="font-bold text-primary">{earnedPoints}</span>
              <span className="text-muted-foreground"> / {totalPoints} pts</span>
            </div>
            <Button size="sm" variant="outline" onClick={refresh} aria-label="Refresh progress"><RefreshCw className="mr-1 h-3 w-3" />Refresh</Button>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today</h2>
          <div className="grid gap-4 sm:grid-cols-2">{dailyChallenges.map(renderCard)}</div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">This week</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{weeklyChallenges.map(renderCard)}</div>
        </section>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Progress uses local activity from Salah tracker, Dhikr counter, Quran reader, and Adhkar. Points contribute to your Achievements.
        </p>
      </main>
    </div>
  );
}
