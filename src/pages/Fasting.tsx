import { localToday } from "@/lib/intl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Sparkles, Check, Flame, CalendarDays } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { computePrayerTimes, formatTime } from "@/lib/prayerTimes";

type FastType = "ramadan" | "monday" | "thursday" | "ayyam_al_bid" | "ashura" | "arafah" | "voluntary";

interface FastEntry {
  date: string; // yyyy-mm-dd
  type: FastType;
  completed: boolean;
  note?: string;
}

const STORAGE_KEY = "heartify.fasting.log.v1";

const TYPE_META: Record<FastType, { label: string; color: string }> = {
  ramadan: { label: "Ramadan", color: "bg-primary/15 text-primary" },
  monday: { label: "Monday sunnah", color: "bg-emerald-500/15 text-emerald-500" },
  thursday: { label: "Thursday sunnah", color: "bg-emerald-500/15 text-emerald-500" },
  ayyam_al_bid: { label: "Ayyām al-Bīḍ (13/14/15)", color: "bg-amber-500/15 text-amber-500" },
  ashura: { label: "ʿĀshūrāʾ", color: "bg-indigo-500/15 text-indigo-500" },
  arafah: { label: "ʿArafah", color: "bg-indigo-500/15 text-indigo-500" },
  voluntary: { label: "Voluntary", color: "bg-secondary text-foreground" },
};

const todayKey = () => localToday();

const loadLog = (): FastEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FastEntry[]) : [];
  } catch {
    return [];
  }
};

const saveLog = (log: FastEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
};

const Fasting = () => {
  const [log, setLog] = useState<FastEntry[]>([]);
  const [type, setType] = useState<FastType>("voluntary");
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setLog(loadLog());
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords({ lat: 21.4225, lng: 39.8262 }), // fallback: Makkah
        { timeout: 4000 },
      );
    }
  }, []);

  const slots = useMemo(() => {
    if (!coords) return null;
    try {
      return computePrayerTimes({ latitude: coords.lat, longitude: coords.lng }, new Date());
    } catch {
      return null;
    }
  }, [coords]);

  const suhoorEnd = slots ? formatTime(slots.find((s) => s.name === "fajr")!.time) : null;
  const iftar = slots ? formatTime(slots.find((s) => s.name === "maghrib")!.time) : null;

  const todaysEntry = log.find((e) => e.date === todayKey());

  const toggleToday = () => {
    const key = todayKey();
    const next = [...log.filter((e) => e.date !== key)];
    if (!todaysEntry?.completed) {
      next.push({ date: key, type, completed: true, note: note.trim() || undefined });
    } else {
      next.push({ ...todaysEntry, completed: false });
    }
    next.sort((a, b) => (a.date < b.date ? 1 : -1));
    setLog(next);
    saveLog(next);
  };

  const setIntent = () => {
    const key = todayKey();
    const next = [...log.filter((e) => e.date !== key)];
    next.push({ date: key, type, completed: false, note: note.trim() || undefined });
    next.sort((a, b) => (a.date < b.date ? 1 : -1));
    setLog(next);
    saveLog(next);
  };

  // Compute current streak of completed fasts (consecutive days ending today or yesterday)
  const streak = useMemo(() => {
    const done = new Set(log.filter((e) => e.completed).map((e) => e.date));
    let count = 0;
    const d = new Date();
    // If today not done, start from yesterday
    if (!done.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    for (;;) {
      const k = d.toISOString().slice(0, 10);
      if (done.has(k)) {
        count += 1;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  }, [log]);

  const totalFasts = log.filter((e) => e.completed).length;
  const ramadanFasts = log.filter((e) => e.completed && e.type === "ramadan").length;

  // Last 30 days heat row
  const heat = useMemo(() => {
    const days: { date: string; done: boolean; type?: FastType }[] = [];
    const map = new Map(log.map((e) => [e.date, e]));
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const entry = map.get(k);
      days.push({ date: k, done: !!entry?.completed, type: entry?.type });
    }
    return days;
  }, [log]);

  const recent = log.slice(0, 14);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title="Fasting Tracker — Ramadan, Sunnah & Voluntary Fasts · Heartify"
        description="Log daily fasts, track your streak, and see Suhoor and Iftar times based on your location. Supports Ramadan, Monday/Thursday, Ayyām al-Bīḍ, ʿĀshūrāʾ and ʿArafah."
        path="/fasting"
      />
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-pill bg-primary/10 p-3">
            <Moon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-title font-bold text-foreground md:text-title">Fasting tracker</h1>
            <p className="text-sm text-muted-foreground">Sawm log · Suhoor & Iftar · streak & history</p>
          </div>
        </header>

        {/* Times + streak */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Moon className="h-4 w-4" /> Suhoor ends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-title font-bold">{suhoorEnd ?? "—"}</p>
              <p className="text-micro text-muted-foreground">at Fajr</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sun className="h-4 w-4" /> Iftar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-title font-bold">{iftar ?? "—"}</p>
              <p className="text-micro text-muted-foreground">at Maghrib</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Flame className="h-4 w-4" /> Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-title font-bold">{streak} <span className="text-sm font-normal text-muted-foreground">days</span></p>
              <p className="text-micro text-muted-foreground">{totalFasts} total · {ramadanFasts} Ramadan</p>
            </CardContent>
          </Card>
        </div>

        {/* Today */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Today · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-micro font-medium uppercase tracking-wide text-muted-foreground">
                Fast type
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TYPE_META) as FastType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-pill border px-3 py-1.5 text-micro font-medium transition-colors",
                      type === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-micro font-medium uppercase tracking-wide text-muted-foreground">
                Niyyah / note (optional)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., For the sake of Allah, seeking His pleasure"
                className="w-full rounded-card border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={toggleToday} variant={todaysEntry?.completed ? "secondary" : "default"}>
                <Check className="mr-1.5 h-4 w-4" />
                {todaysEntry?.completed ? "Mark as broken" : "Mark fast completed"}
              </Button>
              {!todaysEntry && (
                <Button onClick={setIntent} variant="outline">
                  <Sparkles className="mr-1.5 h-4 w-4" /> Set intention only
                </Button>
              )}
              {todaysEntry && (
                <Badge variant="outline" className={TYPE_META[todaysEntry.type].color}>
                  {TYPE_META[todaysEntry.type].label}
                  {todaysEntry.completed ? " · completed" : " · intended"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 30-day heat */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-15 gap-1 sm:grid-cols-30" style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}>
              {heat.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}${d.done ? " · " + TYPE_META[d.type!].label : ""}`}
                  className={cn(
                    "aspect-square rounded-card border",
                    d.done ? "border-primary bg-primary" : "border-border bg-secondary/40",
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent log */}
        <Card>
          <CardHeader>
            <CardTitle>Recent log</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No fasts logged yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((e) => (
                  <li key={e.date} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">
                        {new Date(e.date + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {e.note && <p className="text-micro text-muted-foreground">{e.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={TYPE_META[e.type].color}>
                        {TYPE_META[e.type].label}
                      </Badge>
                      {e.completed ? (
                        <Badge className="bg-primary/15 text-primary">completed</Badge>
                      ) : (
                        <Badge variant="outline">intended</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Fasting;
