import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sunrise, Moon, BedDouble, Sparkles, RotateCcw, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { ADHKAR } from "@/data/adhkar";
import { cn } from "@/lib/utils";

const STORAGE = "heartify:adhkar:v1";
const todayKey = () => new Date().toISOString().slice(0, 10);

interface State {
  date: string;
  progress: Record<string, number>; // itemId -> count done today
}

const load = (): State => {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) {
      const parsed: State = JSON.parse(raw);
      if (parsed.date === todayKey()) return parsed;
    }
  } catch {}
  return { date: todayKey(), progress: {} };
};

const ICONS: Record<string, typeof Sunrise> = {
  morning: Sunrise,
  evening: Moon,
  sleep: BedDouble,
  "after-salah": Sparkles,
};

const Adhkar = () => {
  const [params, setParams] = useSearchParams();
  const activeId = params.get("c") ?? "morning";
  const active = ADHKAR.find((c) => c.id === activeId) ?? ADHKAR[0];
  const [state, setState] = useState<State>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  }, [state]);

  const totals = useMemo(() => {
    const totalRequired = active.items.reduce((s, i) => s + i.repeat, 0);
    const totalDone = active.items.reduce(
      (s, i) => s + Math.min(state.progress[i.id] ?? 0, i.repeat),
      0,
    );
    return {
      totalRequired,
      totalDone,
      pct: Math.round((totalDone / totalRequired) * 100),
    };
  }, [active, state.progress]);

  const bump = (id: string, max: number) =>
    setState((s) => ({
      ...s,
      date: todayKey(),
      progress: {
        ...s.progress,
        [id]: Math.min(max, (s.progress[id] ?? 0) + 1),
      },
    }));

  const resetOne = (id: string) =>
    setState((s) => ({ ...s, progress: { ...s.progress, [id]: 0 } }));

  const resetAll = () =>
    setState({
      date: todayKey(),
      progress: Object.fromEntries(active.items.map((i) => [i.id, 0])),
    });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Adhkar & Duas — morning, evening, sleep, after prayer"
        description="Authentic morning and evening adhkar, before-sleep duas, and post-salah remembrances with Arabic, transliteration, meaning, and tap-to-count progress."
        path="/adhkar"
      />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <header className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            Adhkar &amp; Duas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sunnah remembrances of the Prophet ﷺ. Tap each dhikr to count your
            repetitions. Progress resets at midnight.
          </p>
        </header>

        {/* Category tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {ADHKAR.map((c) => {
            const Icon = ICONS[c.id] ?? Sparkles;
            const isActive = c.id === active.id;
            return (
              <button
                key={c.id}
                onClick={() => setParams({ c: c.id })}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {c.title}
              </button>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Today's progress
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {active.title} · {totals.totalDone}/{totals.totalRequired} recited
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{active.description}</p>
            </div>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
            >
              <RotateCcw className="h-3 w-3" /> Reset today
            </button>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${totals.pct}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <ul className="space-y-4">
          {active.items.map((item) => {
            const done = state.progress[item.id] ?? 0;
            const complete = done >= item.repeat;
            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-2xl border bg-card p-5 transition-colors",
                  complete ? "border-primary/50" : "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {item.translit}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.meaning}
                      {item.reference ? ` · ${item.reference}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                    {done}/{item.repeat}
                  </span>
                </div>

                <p
                  dir="rtl"
                  className="mt-4 font-heading text-2xl leading-loose text-foreground md:text-3xl"
                >
                  {item.arabic}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => bump(item.id, item.repeat)}
                    disabled={complete}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      complete
                        ? "bg-primary/15 text-primary"
                        : "bg-primary text-primary-foreground hover:opacity-90",
                    )}
                  >
                    {complete ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Completed
                      </>
                    ) : (
                      <>Count · {item.repeat - done} left</>
                    )}
                  </button>
                  <button
                    onClick={() => resetOne(item.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs hover:bg-secondary"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prefer a single-dhikr counter? Try the{" "}
          <Link to="/dhikr" className="underline hover:text-foreground">
            tasbih counter
          </Link>
          .
        </p>
      </main>
    </div>
  );
};

export default Adhkar;
