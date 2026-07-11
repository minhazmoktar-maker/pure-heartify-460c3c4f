import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Target, CalendarDays, TrendingUp, Plus, Minus, RotateCcw, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STORAGE_KEY = "heartify.khatm.v1";
const TOTAL_PAGES = 604; // Standard Madani mushaf
const TOTAL_JUZ = 30;

interface KhatmState {
  startedAt: string; // ISO date
  targetDate: string; // ISO date (yyyy-mm-dd)
  pagesRead: number;
  log: Array<{ date: string; pages: number }>; // per-day pages added
  completedKhatms: number;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function defaultState(): KhatmState {
  const target = new Date();
  target.setDate(target.getDate() + 30);
  return {
    startedAt: todayISO(),
    targetDate: target.toISOString().slice(0, 10),
    pagesRead: 0,
    log: [],
    completedKhatms: 0,
  };
}

function loadState(): KhatmState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

const Khatm = () => {
  const [state, setState] = useState<KhatmState>(loadState);
  const [amount, setAmount] = useState(1);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addPages = (n: number) => {
    setState((prev) => {
      const nextPages = Math.max(0, Math.min(TOTAL_PAGES, prev.pagesRead + n));
      const today = todayISO();
      const log = [...prev.log];
      const idx = log.findIndex((e) => e.date === today);
      if (idx >= 0) log[idx] = { date: today, pages: log[idx].pages + n };
      else if (n !== 0) log.push({ date: today, pages: n });
      let completedKhatms = prev.completedKhatms;
      if (nextPages >= TOTAL_PAGES && prev.pagesRead < TOTAL_PAGES) {
        completedKhatms += 1;
        toast.success("SubhanAllah — Khatm complete!", {
          description: "May Allah accept your recitation.",
        });
      }
      return { ...prev, pagesRead: nextPages, log, completedKhatms };
    });
  };

  const resetCycle = () => {
    setState((prev) => ({
      ...prev,
      startedAt: todayISO(),
      pagesRead: 0,
      log: [],
    }));
    toast("Started a new khatm cycle.");
  };

  const clearAll = () => {
    if (!confirm("Clear all khatm data? This cannot be undone.")) return;
    setState(defaultState());
    toast("Khatm data cleared.");
  };

  const stats = useMemo(() => {
    const pct = (state.pagesRead / TOTAL_PAGES) * 100;
    const juzDone = Math.floor(state.pagesRead / (TOTAL_PAGES / TOTAL_JUZ));
    const daysElapsed = Math.max(1, daysBetween(state.startedAt, todayISO()) + 1);
    const daysLeft = Math.max(0, daysBetween(todayISO(), state.targetDate));
    const pagesLeft = TOTAL_PAGES - state.pagesRead;
    const dailyPace = state.pagesRead / daysElapsed;
    const requiredPace = daysLeft > 0 ? pagesLeft / daysLeft : pagesLeft;
    const today = todayISO();
    const readToday = state.log.filter((e) => e.date === today).reduce((s, e) => s + e.pages, 0);
    return { pct, juzDone, daysElapsed, daysLeft, pagesLeft, dailyPace, requiredPace, readToday };
  }, [state]);

  const recentLog = useMemo(() => {
    return [...state.log].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7);
  }, [state.log]);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Khatm Tracker — Quran completion goal"
        description="Track your Quran completion with pacing, daily goals, and khatm milestones."
        path="/khatm"
      />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">Khatm Tracker</h1>
            <p className="text-sm text-muted-foreground">
              Complete the Quran at your own pace — {state.completedKhatms} khatm{state.completedKhatms === 1 ? "" : "s"} completed.
            </p>
          </div>
          <Link
            to="/khatm/groups"
            className="ml-auto rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Group Khatm →
          </Link>
        </header>


        {/* Progress */}
        <Card className="mb-6 p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <div className="text-4xl font-bold text-foreground">
                {state.pagesRead}
                <span className="text-lg font-normal text-muted-foreground"> / {TOTAL_PAGES} pages</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Juz {stats.juzDone} of {TOTAL_JUZ} · {stats.pct.toFixed(1)}%
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Read today: <span className="font-semibold text-foreground">{stats.readToday}</span></div>
              <div>Streak day: {stats.daysElapsed}</div>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, stats.pct)}%` }}
            />
          </div>

          {/* Log pages */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Label htmlFor="amt" className="mr-1">Log pages:</Label>
            <Button variant="outline" size="icon" onClick={() => setAmount((a) => Math.max(1, a - 1))} aria-label="Decrease">
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="amt"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 text-center"
            />
            <Button variant="outline" size="icon" onClick={() => setAmount((a) => a + 1)} aria-label="Increase">
              <Plus className="h-4 w-4" />
            </Button>
            <Button onClick={() => addPages(amount)} className="ml-1">Add {amount} page{amount === 1 ? "" : "s"}</Button>
            <Button variant="ghost" onClick={() => addPages(-amount)}>Undo</Button>
            <div className="ml-auto flex gap-2">
              {[1, 5, 10, 20].map((n) => (
                <Button key={n} variant="secondary" size="sm" onClick={() => addPages(n)}>
                  +{n}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Pacing */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Required pace
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.requiredPace.toFixed(1)}<span className="text-sm font-normal text-muted-foreground"> pages/day</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {stats.pagesLeft} pages left · {stats.daysLeft} day{stats.daysLeft === 1 ? "" : "s"} to target
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Your pace
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.dailyPace.toFixed(1)}<span className="text-sm font-normal text-muted-foreground"> pages/day</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Over {stats.daysElapsed} day{stats.daysElapsed === 1 ? "" : "s"} since start
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Target date
            </div>
            <Input
              type="date"
              value={state.targetDate}
              min={todayISO()}
              onChange={(e) => setState((p) => ({ ...p, targetDate: e.target.value }))}
              className="h-9"
            />
            <div className="mt-1 text-xs text-muted-foreground">
              Started {new Date(state.startedAt).toLocaleDateString()}
            </div>
          </Card>
        </div>

        {/* Recent log */}
        <Card className="mb-6 p-6">
          <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">Last 7 sessions</h2>
          {recentLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pages logged yet. Add your first session above.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentLog.map((e) => (
                <li key={e.date} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{new Date(e.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className="font-medium text-primary">{e.pages} page{e.pages === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={resetCycle}>
            <RotateCcw className="mr-2 h-4 w-4" /> Start new khatm cycle
          </Button>
          <Button variant="ghost" onClick={clearAll} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Clear all data
          </Button>
          <Link to="/quran" className="ml-auto">
            <Button>Open Quran reader</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Khatm;
