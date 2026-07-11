import { useEffect, useMemo, useState } from "react";
import { Moon, Star, Check, Plus, Trash2, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

/**
 * Ramadan Planner
 * - Static approximation of Ramadan start (adjust per moon-sighting in your locale).
 * - Taraweeh tracker: mark each of 30 nights.
 * - Last 10 nights checklist (odd-night emphasis for Laylatul Qadr).
 * - Ramadan goals: user-defined with progress tick.
 * All data on-device.
 */

// Approximate Gregorian date for 1 Ramadan by Hijri year (moon-sighting may shift by ±1 day).
// Extend this table as new years are needed.
const RAMADAN_START: Record<number, string> = {
  1446: "2025-03-01",
  1447: "2026-02-18",
  1448: "2027-02-08",
  1449: "2028-01-28",
  1450: "2029-01-16",
};

const KEY_TARAWEEH = "ramadan:taraweeh";
const KEY_LAYLAH = "ramadan:laylah";
const KEY_GOALS = "ramadan:goals";
const KEY_YEAR = "ramadan:year";

type Goal = { id: string; text: string; done: boolean };

const uid = () => Math.random().toString(36).slice(2, 10);

function load<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function save<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }

function nextRamadanYear(): number {
  const today = new Date();
  const years = Object.keys(RAMADAN_START).map(Number).sort((a, b) => a - b);
  for (const y of years) {
    if (new Date(RAMADAN_START[y]) >= new Date(today.toISOString().slice(0, 10))) return y;
    // If we're inside Ramadan (30 days after start), keep this year
    const end = new Date(RAMADAN_START[y]);
    end.setDate(end.getDate() + 29);
    if (today <= end) return y;
  }
  return years[years.length - 1];
}

const Ramadan = () => {
  const [year, setYear] = useState<number>(() => load<number>(KEY_YEAR, nextRamadanYear()));
  const [taraweeh, setTaraweeh] = useState<number[]>(() => load<number[]>(`${KEY_TARAWEEH}:${year}`, []));
  const [laylah, setLaylah] = useState<Record<string, string[]>>(() => load(`${KEY_LAYLAH}:${year}`, {}));
  const [goals, setGoals] = useState<Goal[]>(() => load<Goal[]>(`${KEY_GOALS}:${year}`, [
    { id: uid(), text: "Complete Quran khatm", done: false },
    { id: uid(), text: "Give sadaqah every day", done: false },
    { id: uid(), text: "Pray Taraweeh nightly", done: false },
    { id: uid(), text: "I'tikaf in last 10 nights (if possible)", done: false },
    { id: uid(), text: "Learn 5 new duas", done: false },
  ]));
  const [newGoal, setNewGoal] = useState("");

  useEffect(() => save(KEY_YEAR, year), [year]);
  useEffect(() => save(`${KEY_TARAWEEH}:${year}`, taraweeh), [taraweeh, year]);
  useEffect(() => save(`${KEY_LAYLAH}:${year}`, laylah), [laylah, year]);
  useEffect(() => save(`${KEY_GOALS}:${year}`, goals), [goals, year]);

  const start = useMemo(() => new Date(RAMADAN_START[year] || RAMADAN_START[nextRamadanYear()]), [year]);
  const today0 = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const dayInRamadan = useMemo(() => {
    const diff = Math.floor((today0.getTime() - start.getTime()) / 86_400_000) + 1;
    return diff >= 1 && diff <= 30 ? diff : 0;
  }, [today0, start]);
  const daysUntil = useMemo(() => {
    return Math.max(0, Math.ceil((start.getTime() - today0.getTime()) / 86_400_000));
  }, [today0, start]);

  const toggleTaraweeh = (n: number) => {
    setTaraweeh((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  };

  // Last 10 nights: nights 21-30 of Ramadan. Odd nights highlighted.
  const NIGHT_ACTIONS = [
    "Extra Qur'an",
    "Dua & tafakkur",
    "Sadaqah",
    "Salatul Layl",
    "Istighfar (100+)",
  ];

  const toggleAction = (night: number, action: string) => {
    setLaylah((prev) => {
      const key = String(night);
      const set = new Set(prev[key] || []);
      set.has(action) ? set.delete(action) : set.add(action);
      return { ...prev, [key]: [...set] };
    });
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    setGoals((g) => [...g, { id: uid(), text: newGoal.trim(), done: false }]);
    setNewGoal("");
  };
  const toggleGoal = (id: string) => setGoals((g) => g.map((x) => x.id === id ? { ...x, done: !x.done } : x));
  const deleteGoal = (id: string) => setGoals((g) => g.filter((x) => x.id !== id));

  const taraweehPct = Math.round((taraweeh.length / 30) * 100);
  const goalsPct = goals.length ? Math.round((goals.filter((g) => g.done).length / goals.length) * 100) : 0;

  const availableYears = Object.keys(RAMADAN_START).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Ramadan Planner — Taraweeh, Last 10 Nights & Goals | Heartify"
        description="Plan your Ramadan: countdown, Taraweeh tracker across all 30 nights, Laylatul Qadr checklist for the last 10 nights, and your personal Ramadan goals."
        path="/ramadan"
      />
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Moon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Ramadan Planner</h1>
              <p className="mt-1 text-muted-foreground">
                Ramadan {year} AH · begins ~{start.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 rounded-md border border-border bg-background px-2 text-sm"
          >
            {availableYears.map((y) => <option key={y} value={y}>{y} AH</option>)}
          </select>
        </header>

        {/* Countdown / in-progress */}
        <section className="mb-6 rounded-2xl border border-primary/40 bg-primary/5 p-5">
          {dayInRamadan > 0 ? (
            <>
              <p className="text-sm font-medium text-primary">You are in Ramadan</p>
              <p className="mt-1 font-heading text-3xl font-bold text-foreground">Day {dayInRamadan} of 30</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary transition-all" style={{ width: `${(dayInRamadan / 30) * 100}%` }} />
              </div>
            </>
          ) : daysUntil > 0 ? (
            <>
              <p className="text-sm font-medium text-primary">Countdown to Ramadan</p>
              <p className="mt-1 font-heading text-3xl font-bold text-foreground">
                {daysUntil} {daysUntil === 1 ? "day" : "days"} to go
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Use this time to prepare your heart, body, and goals.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-primary">Ramadan has passed</p>
              <p className="mt-1 text-sm text-muted-foreground">Select the next Hijri year above to plan ahead.</p>
            </>
          )}
        </section>

        {/* Summary tiles */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Taraweeh nights</p>
              <p className="text-xs font-medium text-primary">{taraweehPct}%</p>
            </div>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">{taraweeh.length} / 30</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${taraweehPct}%` }} />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Ramadan goals</p>
              <p className="text-xs font-medium text-primary">{goalsPct}%</p>
            </div>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {goals.filter((g) => g.done).length} / {goals.length}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${goalsPct}%` }} />
            </div>
          </div>
        </section>

        {/* Taraweeh grid */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">Taraweeh tracker</h2>
          <p className="mb-3 text-xs text-muted-foreground">Tap a night once you've prayed Taraweeh.</p>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
              const done = taraweeh.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => toggleTaraweeh(n)}
                  className={`aspect-square rounded-lg border text-sm font-semibold transition ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </section>

        {/* Last 10 nights */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-[hsl(var(--gold))]" />
            <h2 className="font-heading text-lg font-semibold text-foreground">Last 10 nights — Laylatul Qadr</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            "Seek it in the last ten, in the odd nights." — Bukhari. Odd nights (21, 23, 25, 27, 29) are especially emphasized.
          </p>
          <div className="space-y-3">
            {Array.from({ length: 10 }, (_, i) => 21 + i).map((n) => {
              const odd = n % 2 === 1;
              const done = (laylah[String(n)] || []).length;
              return (
                <div
                  key={n}
                  className={`rounded-xl border p-3 ${odd ? "border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/5" : "border-border bg-background"}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-heading text-sm font-semibold text-foreground">
                      Night {n}{odd && <span className="ml-2 text-xs text-[hsl(var(--gold))]">(odd)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{done} / {NIGHT_ACTIONS.length}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {NIGHT_ACTIONS.map((a) => {
                      const active = (laylah[String(n)] || []).includes(a);
                      return (
                        <button
                          key={a}
                          onClick={() => toggleAction(n, a)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Goals */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">Ramadan goals</h2>
          </div>
          <div className="mb-3 flex gap-2">
            <input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="Add a Ramadan goal…"
              className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            />
            <button
              onClick={addGoal}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          <ul className="space-y-2">
            {goals.map((g) => (
              <li key={g.id} className={`flex items-center justify-between gap-2 rounded-lg border p-3 ${g.done ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}>
                <button
                  onClick={() => toggleGoal(g.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${g.done ? "border-primary bg-primary" : "border-border"}`}>
                    {g.done && <Check className="h-3 w-3 text-primary-foreground" />}
                  </span>
                  <span className={`text-sm ${g.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{g.text}</span>
                </button>
                <button onClick={() => deleteGoal(g.id)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">No goals yet.</p>
            )}
          </ul>
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ramadan dates are approximate — always confirm with your local moon-sighting authority.
        </p>
      </main>
    </div>
  );
};

export default Ramadan;
