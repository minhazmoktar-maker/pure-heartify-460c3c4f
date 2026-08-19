import { localToday } from "@/lib/intl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sunrise, BookOpen, BookText, Target, Flame, Compass, ArrowRight, Sparkles, Loader2, WifiOff } from "lucide-react";
import { ASMA_UL_HUSNA } from "@/data/asmaUlHusna";
import { heartAyahForDay } from "@/data/heartAyat";

// Cached daily payloads to avoid re-fetching
const DAILY_CACHE_KEY = "heartify.today.cache.v1";
type DailyCache = {
  date: string;
  ayah?: { arabic: string; english: string; ref: string };
  hadith?: { text: string; ref: string };
  /** True when both ayah/hadith are the bundled offline fallback. */
  fallback?: boolean;
};

function todayISO() { return localToday(); }

// Deterministic "seed of the day" so ayah/hadith rotate but stay stable per day
function dayIndex() {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

// Bundled offline fallback so /today is never a dead screen on a cold cache
// with no network — the one screen the user can return to 10× a day guilt-free.

const FALLBACK_HADITH: NonNullable<DailyCache["hadith"]>[] = [
  {
    text: "Actions are but by intention, and every person will have only what they intended.",
    ref: "40 Hadith Nawawi #1",
  },
  {
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    ref: "40 Hadith Nawawi #13",
  },
];

/** Loads today's daily payload from cache; fetches when online; falls back
 *  to a bundled ayah/hadith when both cache and network are unavailable. */
export async function loadDaily(): Promise<DailyCache> {
  try {
    const cached = JSON.parse(localStorage.getItem(DAILY_CACHE_KEY) || "null");
    if (cached && cached.date === todayISO()) return cached;
  } catch { /* ignore */ }

  const idx = dayIndex();
  const hadithNum = (idx % 40) + 1;
  const cache: DailyCache = { date: todayISO() };

  // Ayah of the day comes from the curated heart-touching rotation — bundled,
  // instant, and guaranteed to be a different ayah every day for 423 days.
  {
    const pick = heartAyahForDay();
    cache.ayah = { arabic: pick.ar, english: pick.en, ref: `Surah ${pick.ref}` };
  }

  try {
    const r = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-nawawi/${hadithNum}.min.json`);
    if (r.ok) {
      const d = await r.json();
      const h = d.hadiths?.[0];
      if (h) cache.hadith = { text: h.text, ref: `40 Hadith Nawawi #${h.hadithnumber}` };
    }
  } catch { /* offline */ }

  // Bundled fallback when both sources failed and no prior cache exists.
  if (!cache.hadith) {
    cache.hadith = FALLBACK_HADITH[idx % FALLBACK_HADITH.length];
    cache.fallback = true;
  }

  try { localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  return cache;
}

function useLocalStats() {
  const [stats, setStats] = useState({ salahStreak: 0, salahDone: 0, dhikrTotal: 0, dhikrToday: 0 });
  useEffect(() => {
    try {
      const today = todayISO();
      const raw = JSON.parse(localStorage.getItem("heartify.salah.tracker.v1") || "{}");
      const rec = raw[today] || {};
      let salahDone = 0;
      for (const p of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) if (rec[p] && rec[p] !== "none") salahDone++;

      // Streak
      let streak = 0, broke = false;
      const t = new Date();
      for (let i = 0; i < 60; i++) {
        const d = new Date(t); d.setDate(t.getDate() - i);
        const r = raw[d.toISOString().slice(0, 10)] || {};
        const complete = ["fajr","dhuhr","asr","maghrib","isha"].every(p => r[p] && r[p] !== "none");
        if (!broke && complete) streak++; else broke = true;
      }

      let dhikr: any = {};
      try { dhikr = JSON.parse(localStorage.getItem("heartify.dhikr.v1") || "{}"); } catch {}
      setStats({ salahStreak: streak, salahDone, dhikrTotal: dhikr.lifetime || 0, dhikrToday: dhikr.today || 0 });
    } catch {}
  }, []);
  return stats;
}

export default function Today() {
  const [daily, setDaily] = useState<DailyCache | null>(null);
  const [loading, setLoading] = useState(true);
  const stats = useLocalStats();

  useEffect(() => {
    loadDaily().then(d => setDaily(d)).finally(() => setLoading(false));
  }, []);

  const nameOfDay = useMemo(() => ASMA_UL_HUSNA[dayIndex() % ASMA_UL_HUSNA.length], []);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "As-salamu alaykum · Good morning";
    if (h < 17) return "As-salamu alaykum · Good afternoon";
    return "As-salamu alaykum · Good evening";
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Today — Heartify" description="Your daily dose: ayah of the day, hadith of the day, name of Allah, live streaks, and quick actions." path="/today" />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="mt-1 flex items-center gap-2 text-title font-bold"><Sunrise className="h-7 w-7 text-primary" />Today</h1>
          {(daily?.fallback || (typeof navigator !== "undefined" && !navigator.onLine)) && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-border bg-muted/50 px-2.5 py-1 text-micro text-muted-foreground">
              <WifiOff className="h-3 w-3" aria-hidden />
              Offline — showing your saved Today
            </p>
          )}
        </header>

        {/* Streak strip */}
        <h2 className="sr-only">Your daily worship stats</h2>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-micro text-muted-foreground">Salah streak</p>
                <p className="text-title font-bold">{stats.salahStreak}<span className="ml-1 text-sm font-normal text-muted-foreground">days</span></p>
              </div>
              <Flame className="h-8 w-8 text-orange-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-micro text-muted-foreground">Prayers today</p>
                <p className="text-title font-bold">{stats.salahDone}<span className="ml-1 text-sm font-normal text-muted-foreground">/ 5</span></p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-micro text-muted-foreground">Lifetime dhikr</p>
                <p className="text-title font-bold">{stats.dhikrTotal.toLocaleString()}</p>
              </div>
              <Sparkles className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
        </div>

        <h2 className="sr-only">Today's spiritual reflections</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Ayah */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-heading"><BookOpen className="h-5 w-5 text-primary" />Ayah of the day</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{daily?.ayah?.ref || "…"}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : daily?.ayah ? (
                <>
                  <p dir="rtl" lang="ar" className="text-right text-title leading-loose">{daily.ayah.arabic}</p>
                  <p className="text-sm leading-relaxed text-foreground/90">{daily.ayah.english}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Couldn't load today's ayah. Try refreshing.</p>
              )}
              <Button asChild size="sm" variant="ghost" className="w-full justify-between">
                <Link to="/quran">Open Quran reader <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Hadith */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-heading"><BookText className="h-5 w-5 text-primary" />Hadith of the day</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{daily?.hadith?.ref || "…"}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : daily?.hadith ? (
                <p className="text-sm leading-relaxed text-foreground/90">{daily.hadith.text}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Couldn't load today's hadith. Try refreshing.</p>
              )}
              <Button asChild size="sm" variant="ghost" className="w-full justify-between">
                <Link to="/hadith">Open Hadith library <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Name of Allah */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-heading"><Sparkles className="h-5 w-5 text-primary" />Name of Allah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-center">
              <p dir="rtl" lang="ar" className="text-display font-semibold">{nameOfDay.ar}</p>
              <p className="text-heading font-medium text-primary">{nameOfDay.translit}</p>
              <p className="text-sm text-muted-foreground">{nameOfDay.meaning}</p>
              <Button asChild size="sm" variant="ghost" className="mt-2 w-full justify-between">
                <Link to="/names">Explore all 99 Names <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-heading">Quick actions</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm"><Link to="/prayer"><Compass className="mr-1 h-4 w-4" />Prayer times</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/salah"><Target className="mr-1 h-4 w-4" />Mark salah</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/adhkar"><Sunrise className="mr-1 h-4 w-4" />Adhkar</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/challenges"><Target className="mr-1 h-4 w-4" />Challenges</Link></Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
