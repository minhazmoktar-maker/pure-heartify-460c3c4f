import { localToday } from "@/lib/intl";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Flame, ListChecks, TrendingUp } from "lucide-react";

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
type Status = "none" | "on_time" | "late" | "qada";

const PRAYERS: { key: PrayerKey; label: string }[] = [
  { key: "fajr", label: "Fajr" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

const STATUS_ORDER: Status[] = ["none", "on_time", "late", "qada"];
const STATUS_META: Record<Status, { label: string; color: string; points: number }> = {
  none: { label: "Not marked", color: "text-muted-foreground", points: 0 },
  on_time: { label: "On time", color: "text-emerald-500", points: 3 },
  late: { label: "Late", color: "text-amber-500", points: 2 },
  qada: { label: "Qada (missed)", color: "text-red-500", points: 1 },
};

const STORAGE_KEY = "heartify.salah.tracker.v1";

type DayRecord = Record<PrayerKey, Status>;
type Store = Record<string, DayRecord>; // "YYYY-MM-DD" -> record

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function emptyDay(): DayRecord {
  return { fajr: "none", dhuhr: "none", asr: "none", maghrib: "none", isha: "none" };
}
function loadStore(): Store {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveStore(s: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export default function SalahTracker() {
  const [store, setStore] = useState<Store>({});
  const [selectedDate, setSelectedDate] = useState<string>(iso(new Date()));

  useEffect(() => setStore(loadStore()), []);

  const day = store[selectedDate] ?? emptyDay();

  const setPrayer = (key: PrayerKey, s: Status) => {
    const next = { ...store, [selectedDate]: { ...day, [key]: s } };
    setStore(next);
    saveStore(next);
  };

  const cycle = (key: PrayerKey) => {
    const cur = day[key];
    const idx = STATUS_ORDER.indexOf(cur);
    setPrayer(key, STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]);
  };

  // Last 30 days stats
  const stats = useMemo(() => {
    let onTime = 0, late = 0, qada = 0, missed = 0, streak = 0;
    let brokeStreak = false;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const rec = store[iso(d)] ?? emptyDay();
      let dayHasMiss = false;
      for (const p of PRAYERS) {
        const s = rec[p.key];
        if (s === "on_time") onTime++;
        else if (s === "late") late++;
        else if (s === "qada") qada++;
        else { missed++; dayHasMiss = true; }
      }
      if (!brokeStreak && !dayHasMiss) streak++;
      else brokeStreak = true;
    }
    const total = onTime + late + qada + missed;
    return { onTime, late, qada, missed, streak, total };
  }, [store]);

  // Last 14-day heatmap
  const heatmap = useMemo(() => {
    const days: { date: string; label: string; points: number; max: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const rec = store[iso(d)] ?? emptyDay();
      const points = PRAYERS.reduce((sum, p) => sum + STATUS_META[rec[p.key]].points, 0);
      days.push({
        date: iso(d),
        label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        points,
        max: 15,
      });
    }
    return days;
  }, [store]);

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(iso(d));
  };

  const isToday = selectedDate === iso(new Date());

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Salah Tracker — Heartify"
        description="Track your five daily prayers, build streaks, and see 30-day statistics."
        path="/salah"
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-title font-bold">
            <ListChecks className="h-7 w-7 text-primary" />
            Salah Tracker
          </h1>
          <p className="mt-1 text-muted-foreground">
            Mark each prayer as on-time, late, or qada. Build a consistency streak.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-heading">
                {isToday ? "Today" : new Date(selectedDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => shiftDay(-1)}>← Prev</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedDate(iso(new Date()))} disabled={isToday}>Today</Button>
                <Button size="sm" variant="ghost" onClick={() => shiftDay(1)} disabled={isToday}>Next →</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {PRAYERS.map((p) => {
                const s = day[p.key];
                const meta = STATUS_META[s];
                return (
                  <button
                    key={p.key}
                    onClick={() => cycle(p.key)}
                    className="flex w-full items-center justify-between rounded-card border p-3 text-left transition hover:border-primary/60"
                    aria-label={`${p.label}: ${meta.label}. Tap to change.`}
                  >
                    <div className="flex items-center gap-3">
                      {s === "none" ? <Circle className={`h-5 w-5 ${meta.color}`} /> : <CheckCircle2 className={`h-5 w-5 ${meta.color}`} />}
                      <span className="font-medium">{p.label}</span>
                    </div>
                    <Badge variant="secondary" className={`${meta.color}`}>{meta.label}</Badge>
                  </button>
                );
              })}
              <p className="pt-1 text-[11px] text-muted-foreground">
                Tap a prayer to cycle: Not marked → On time → Late → Qada → Not marked.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-heading">
                <Flame className="h-5 w-5 text-orange-500" /> {stats.streak}-day streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Consecutive days with no missed prayers.
              </p>
              <div className="rounded-card border p-3">
                <div className="mb-2 flex items-center gap-2 text-micro font-semibold text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> Last 30 days
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-micro">
                  <span className="text-emerald-500">On time</span><span className="text-right font-mono">{stats.onTime}</span>
                  <span className="text-amber-500">Late</span><span className="text-right font-mono">{stats.late}</span>
                  <span className="text-red-500">Qada</span><span className="text-right font-mono">{stats.qada}</span>
                  <span className="text-muted-foreground">Missed</span><span className="text-right font-mono">{stats.missed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader className="pb-3"><CardTitle className="text-heading">Last 14 days</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
              {heatmap.map((d) => {
                const intensity = d.points / d.max;
                const bg =
                  intensity === 0 ? "bg-muted" :
                  intensity < 0.34 ? "bg-primary/30" :
                  intensity < 0.67 ? "bg-primary/60" : "bg-primary";
                return (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDate(d.date)}
                    className={`aspect-square rounded ${bg} ${d.date === selectedDate ? "ring-2 ring-ring" : ""}`}
                    title={`${d.label} — ${d.points}/${d.max} points`}
                    aria-label={`${d.label}: ${d.points} of ${d.max} points`}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Points: On time = 3, Late = 2, Qada = 1, Missed = 0. Max 15/day.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
