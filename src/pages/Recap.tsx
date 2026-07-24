import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, CircleDot, BookOpen, Flame, Trophy, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import ShareImageButton from "@/components/ShareImageButton";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";

type SalahEntry = { fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string };

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const last7Days = () => {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

const Recap = () => {
  const days = useMemo(last7Days, []);

  const salahLog = readJSON<Record<string, SalahEntry>>("salah:log", {});
  const dhikrLog = readJSON<Record<string, number>>("dhikr:daily", {});
  const quranLog = readJSON<Record<string, number>>("quran:versesRead", {});
  const streak = readJSON<{ current: number; longest: number }>("dhikr:streak", { current: 0, longest: 0 });

  const totals = days.reduce(
    (acc, d) => {
      const e = salahLog[d] ?? {};
      const prayed = (["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).filter(
        (k) => e[k] === "on_time" || e[k] === "late" || e[k] === "qada",
      ).length;
      const onTime = (["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).filter(
        (k) => e[k] === "on_time",
      ).length;
      acc.prayed += prayed;
      acc.onTime += onTime;
      acc.dhikr += dhikrLog[d] ?? 0;
      acc.verses += quranLog[d] ?? 0;
      if (prayed >= 5) acc.perfectDays += 1;
      return acc;
    },
    { prayed: 0, onTime: 0, dhikr: 0, verses: 0, perfectDays: 0 },
  );

  const maxDhikr = Math.max(1, ...days.map((d) => dhikrLog[d] ?? 0));
  const onTimePct = totals.prayed === 0 ? 0 : Math.round((totals.onTime / totals.prayed) * 100);

  const stats = [
    { label: "Prayers logged", value: totals.prayed, sub: `${onTimePct}% on time`, icon: CheckCircle2, color: "text-primary" },
    { label: "Dhikr counted", value: totals.dhikr.toLocaleString(), sub: "past 7 days", icon: CircleDot, color: "text-[hsl(var(--gold))]" },
    { label: "Ayat read", value: totals.verses.toLocaleString(), sub: "verses", icon: BookOpen, color: "text-primary" },
    { label: "Perfect days", value: totals.perfectDays, sub: "all 5 prayers", icon: Trophy, color: "text-[hsl(var(--gold))]" },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title="Weekly Recap — Heartify"
        description="Your last 7 days of prayers, dhikr, and Quran reading in one glance."
        path="/recap"
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-card bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-title font-bold text-foreground md:text-title">Weekly recap</h1>
            <p className="text-sm text-muted-foreground">A snapshot of your last 7 days of worship.</p>
          </div>
        </div>

        {/* Streak */}
        <div className="mb-6 flex items-center justify-between rounded-card border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 text-[hsl(var(--gold))]" />
            <div>
              <div className="text-sm text-muted-foreground">Current dhikr streak</div>
              <div className="font-heading text-title font-bold text-foreground">{streak.current} days</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-micro uppercase tracking-wide text-muted-foreground">Longest</div>
            <div className="font-heading text-heading font-semibold text-foreground">{streak.longest} days</div>
          </div>
        </div>

        {/* Share row */}
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-card border border-border bg-card p-4">
          <div className="min-w-0 flex-1 pr-2">
            <div className="font-heading text-sm font-semibold text-foreground">Share your week</div>
            <div className="text-micro text-muted-foreground">
              Encourage a friend — generate a beautiful card of your progress.
            </div>
          </div>
          <ShareImageButton
            variant="solid"
            label="Share recap"
            input={{
              variant: "quote",
              kicker: "My week on Heartify",
              translation: `${totals.prayed} prayers · ${totals.dhikr.toLocaleString()} dhikr · ${totals.verses.toLocaleString()} ayat · ${totals.perfectDays} perfect days`,
              attribution: `${streak.current}-day streak · ${onTimePct}% on time`,
            }}
            meta={{
              title: "My Heartify week",
              text: `${totals.prayed} prayers · ${totals.dhikr.toLocaleString()} dhikr · ${streak.current}-day streak. Join me on Heartify.`,
              url: typeof window !== "undefined" ? `${window.location.origin}/recap` : "/recap",
            }}
          />
          <WhatsAppShareButton
            message={`My last 7 days on Heartify: ${totals.prayed} prayers, ${totals.dhikr.toLocaleString()} dhikr, ${streak.current}-day streak. Join me ↓`}
            url={typeof window !== "undefined" ? `${window.location.origin}/` : "https://pure-heartify.lovable.app/"}
            label="WhatsApp"
          />
        </div>

        {/* Stats grid */}

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="rounded-card border border-border bg-card p-4">
              <Icon className={`mb-2 h-5 w-5 ${color}`} />
              <div className="font-heading text-title font-bold text-foreground">{value}</div>
              <div className="text-micro font-medium text-foreground">{label}</div>
              <div className="text-[11px] text-muted-foreground">{sub}</div>
            </div>
          ))}
        </div>

        {/* Dhikr sparkline */}
        <div className="mb-6 rounded-card border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-foreground">Dhikr per day</h2>
            <span className="text-micro text-muted-foreground">last 7 days</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {days.map((d) => {
              const value = dhikrLog[d] ?? 0;
              const h = Math.max(4, Math.round((value / maxDhikr) * 100));
              const dayLabel = new Date(d).toLocaleDateString(undefined, { weekday: "short" });
              return (
                <div key={d} className="flex flex-1 flex-col items-center gap-1">
                  <div className="text-[10px] font-medium text-muted-foreground">{value || ""}</div>
                  <div
                    className="w-full rounded-t-md bg-primary/70"
                    style={{ height: `${h}%` }}
                    aria-label={`${dayLabel}: ${value} dhikr`}
                  />
                  <div className="text-[10px] text-muted-foreground">{dayLabel}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prayer heat row */}
        <div className="rounded-card border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-foreground">Prayer completion</h2>
            <span className="text-micro text-muted-foreground">5 = perfect day</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const e = salahLog[d] ?? {};
              const count = (["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).filter(
                (k) => e[k] === "on_time" || e[k] === "late" || e[k] === "qada",
              ).length;
              const intensity = count / 5;
              const dayLabel = new Date(d).toLocaleDateString(undefined, { weekday: "short" });
              return (
                <div key={d} className="flex flex-col items-center gap-1">
                  <div
                    className="h-14 w-full rounded-card border border-border"
                    style={{ backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.75})` }}
                    aria-label={`${dayLabel}: ${count}/5 prayers`}
                  />
                  <div className="text-[10px] font-medium text-foreground">{count}/5</div>
                  <div className="text-[10px] text-muted-foreground">{dayLabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Recap;
