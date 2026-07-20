import { localToday } from "@/lib/intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Plus, Minus, Flame, Target, Check, X, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

interface Preset {
  id: string;
  arabic: string;
  translit: string;
  meaning: string;
  target: number;
}

const PRESETS: Preset[] = [
  { id: "subhanallah", arabic: "سُبْحَانَ ٱللَّٰهِ", translit: "SubhanAllah", meaning: "Glory be to Allah", target: 33 },
  { id: "alhamdulillah", arabic: "ٱلْحَمْدُ لِلَّٰهِ", translit: "Alhamdulillah", meaning: "All praise is due to Allah", target: 33 },
  { id: "allahuakbar", arabic: "ٱللَّٰهُ أَكْبَرُ", translit: "Allahu Akbar", meaning: "Allah is the Greatest", target: 34 },
  { id: "lailahaillallah", arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", translit: "La ilaha illallah", meaning: "There is no god but Allah", target: 100 },
  { id: "astaghfirullah", arabic: "أَسْتَغْفِرُ ٱللَّٰهَ", translit: "Astaghfirullah", meaning: "I seek Allah's forgiveness", target: 100 },
  { id: "salawat", arabic: "ﷺ", translit: "Salawat on the Prophet", meaning: "Peace and blessings upon him", target: 100 },
];

const STORAGE = "heartify:dhikr:v1";

interface State {
  activeId: string;
  counts: Record<string, number>;
  target: number;
  lastDate: string;
  streak: number;
  todayCompleted: number;
}

const todayKey = () => localToday();

const loadState = (): State => {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {}
  return defaults();
};

const defaults = (): State => ({
  activeId: PRESETS[0].id,
  counts: {},
  target: 33,
  lastDate: todayKey(),
  streak: 0,
  todayCompleted: 0,
});

const Dhikr = () => {
  const [state, setState] = useState<State>(loadState);
  const active = useMemo(() => PRESETS.find((p) => p.id === state.activeId) ?? PRESETS[0], [state.activeId]);
  const count = state.counts[active.id] ?? 0;
  const progress = Math.min(100, Math.round((count / state.target) * 100));

  // Gentle haptic-style pulse: a per-tap ripple ring so every count feels
  // acknowledged even on devices without vibration.
  const [pulseKey, setPulseKey] = useState(0);

  // Session accounting so we can show an end-of-session summary.
  const sessionStartRef = useRef<number | null>(null);
  const sessionStartCountRef = useRef<number>(0);
  const [summary, setSummary] = useState<
    | { dhikr: string; counted: number; durationMs: number; streak: number; goalsHitDelta: number }
    | null
  >(null);

  // Roll over date + reset daily completions each day
  useEffect(() => {
    const today = todayKey();
    if (state.lastDate !== today) {
      setState((s) => {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const keepStreak = s.lastDate === yesterday && s.todayCompleted > 0;
        return {
          ...s,
          lastDate: today,
          counts: {},
          todayCompleted: 0,
          streak: keepStreak ? s.streak : s.todayCompleted > 0 ? s.streak : 0,
        };
      });
    }
  }, [state.lastDate]);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  }, [state]);

  const bump = (delta: number) => {
    // Trigger a fresh pulse ring on every positive tap.
    if (delta > 0) setPulseKey((k) => k + 1);
    // Native haptic when available — layered on top of the sound cue below.
    if (delta > 0 && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.(12); } catch { /* noop */ }
    }
    setState((s) => {
      const prev = s.counts[active.id] ?? 0;
      const next = Math.max(0, prev + delta);
      const justCompleted = prev < s.target && next >= s.target;
      const newTodayCompleted = s.todayCompleted + (justCompleted ? 1 : 0);
      let newStreak = s.streak;
      if (justCompleted && s.todayCompleted === 0) newStreak = s.streak + 1;

      // Start a session on the first positive tap after being at zero.
      if (delta > 0 && sessionStartRef.current == null) {
        sessionStartRef.current = Date.now();
        sessionStartCountRef.current = prev;
      }

      // Sound + haptics — Phase 10. Tap on every increment, chime on goal,
      // warm swell when the streak advances. Lazy import so first paint stays cheap.
      import("@/lib/soundHaptics").then((m) => {
        if (delta < 0) return m.soundNudge();
        if (justCompleted && s.todayCompleted === 0) return m.soundStreakSave();
        if (justCompleted) return m.soundGoal();
        return m.soundTap();
      }).catch(() => {});
      if (justCompleted) {
        import("@/lib/celebrate").then((m) => m.celebrateSmall()).catch(() => {});
        // Auto-open the end-of-session summary on goal — but only once per
        // session, so a user pushing past the goal isn't interrupted.
        const start = sessionStartRef.current ?? Date.now();
        const counted = next - sessionStartCountRef.current;
        setTimeout(() => {
          setSummary({
            dhikr: active.translit,
            counted,
            durationMs: Date.now() - start,
            streak: newStreak,
            goalsHitDelta: justCompleted ? 1 : 0,
          });
        }, 400);
      }
      return {
        ...s,
        counts: { ...s.counts, [active.id]: next },
        todayCompleted: newTodayCompleted,
        streak: newStreak,
      };
    });
  };

  const finishSession = () => {
    const start = sessionStartRef.current;
    if (start == null) return;
    const counted = count - sessionStartCountRef.current;
    if (counted <= 0) {
      sessionStartRef.current = null;
      return;
    }
    setSummary({
      dhikr: active.translit,
      counted,
      durationMs: Date.now() - start,
      streak: state.streak,
      goalsHitDelta: 0,
    });
  };

  const closeSummary = () => {
    setSummary(null);
    sessionStartRef.current = null;
    sessionStartCountRef.current = count;
  };

  const reset = () => {
    setState((s) => ({ ...s, counts: { ...s.counts, [active.id]: 0 } }));
    sessionStartRef.current = null;
    sessionStartCountRef.current = 0;
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Dhikr & Tasbih counter — daily remembrance"
        description="Tap-to-count digital tasbih with SubhanAllah, Alhamdulillah, Allahu Akbar, salawat, istighfar, daily goals and streaks."
        path="/dhikr"
      />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <header className="mb-8">
          <h1 className="font-heading text-title font-bold text-foreground md:text-display">Dhikr &amp; Tasbih</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap anywhere on the counter to remember Allah. Your goals and streak stay on this device.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Counter card */}
          <section className="rounded-card border border-border bg-card p-6 md:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-micro uppercase tracking-wide text-muted-foreground">Now reciting</p>
                <p className="text-heading font-semibold text-foreground">{active.translit}</p>
                <p className="text-micro text-muted-foreground">{active.meaning}</p>
              </div>
              <div className="flex items-center gap-2 rounded-pill bg-secondary px-3 py-1.5 text-micro">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-foreground">Goal {state.target}</span>
              </div>
            </div>

            <button
              onClick={() => bump(1)}
              aria-label={`Tap to count ${active.translit}`}
              className="btn-physical group relative flex aspect-square w-full max-w-md mx-auto items-center justify-center rounded-pill bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border-4 border-primary/30 min-h-[280px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/60"
            >
              <div className="absolute inset-4 rounded-pill border border-border/60" />
              {/* Subtle inner ring adds physical depth to the primary CTA */}
              <div className="pointer-events-none absolute inset-0 rounded-pill shadow-[inset_0_2px_6px_hsl(var(--primary)/0.18)]" aria-hidden />
              {/* Gentle pulse ring on every count — respects prefers-reduced-motion via CSS. */}
              <span
                key={pulseKey}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-pill border-2 border-primary/60 motion-safe:animate-ping motion-safe:opacity-0"
              />
              <div className="text-center">
                <p dir="rtl" lang="ar" className="font-arabic text-display text-foreground md:text-display leading-relaxed" style={{ fontFeatureSettings: '"liga","calt","kern","rlig"' }}>
                  {active.arabic}
                </p>
                <p className="mt-4 font-bold tabular-nums text-primary text-[64px] leading-none md:text-[88px]">{count}</p>
                <p className="mt-2 text-micro text-muted-foreground">
                  {count >= state.target ? (
                    <span className="inline-flex items-center gap-1 text-primary"><Check className="h-3 w-3" /> Goal reached — keep going</span>
                  ) : (
                    <>{state.target - count} to reach goal</>
                  )}
                </p>
              </div>
            </button>

            {/* Progress */}
            <div className="mt-6 h-2 w-full overflow-hidden rounded-pill bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>

            {/* Controls — big, thumb-friendly Count is the primary action. */}
            <div className="mt-5 grid gap-2">
              <button
                onClick={() => bump(1)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-primary py-4 text-base font-semibold text-primary-foreground shadow-elev-2 hover:opacity-90 active:scale-[0.98]"
              >
                <Plus className="h-5 w-5" /> Count
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => bump(-1)} className="inline-flex items-center justify-center gap-1 rounded-pill border border-border bg-background px-3 py-2 text-sm hover:bg-secondary">
                  <Minus className="h-3.5 w-3.5" /> Undo
                </button>
                <button onClick={finishSession} className="inline-flex items-center justify-center gap-1 rounded-pill border border-border bg-background px-3 py-2 text-sm hover:bg-secondary">
                  <Sparkles className="h-3.5 w-3.5" /> Finish
                </button>
                <button onClick={reset} className="inline-flex items-center justify-center gap-1 rounded-pill border border-border bg-background px-3 py-2 text-sm hover:bg-secondary">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 text-micro text-muted-foreground">
              <label className="flex items-center gap-2">
                Target
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={state.target}
                  onChange={(e) => setState((s) => ({ ...s, target: Math.max(1, Number(e.target.value) || 1) }))}
                  className="w-20 rounded-card border border-border bg-background px-2 py-1 text-center text-foreground"
                />
              </label>
              {[33, 100, 500].map((n) => (
                <button key={n} onClick={() => setState((s) => ({ ...s, target: n }))} className="rounded-pill border border-border px-2 py-0.5 hover:bg-secondary">{n}</button>
              ))}
            </div>
          </section>

          {/* Right column */}
          <aside className="space-y-4">
            <div className="rounded-card border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[hsl(var(--gold))]" />
                <h2 className="text-sm font-semibold text-foreground">Daily streak</h2>
              </div>
              <p className="mt-3 text-display font-bold text-foreground">{state.streak} <span className="text-sm font-normal text-muted-foreground">days</span></p>
              <p className="mt-1 text-micro text-muted-foreground">
                Complete any dhikr goal today to keep your streak alive. Completed today: {state.todayCompleted}
              </p>
            </div>

            <div className="rounded-card border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Choose a dhikr</h2>
              <ul className="space-y-1">
                {PRESETS.map((p) => {
                  const isActive = p.id === active.id;
                  const c = state.counts[p.id] ?? 0;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => setState((s) => ({ ...s, activeId: p.id, target: p.target }))}
                        className={`flex w-full items-center justify-between rounded-card px-3 py-2 text-left text-sm transition-colors ${
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
                        }`}
                      >
                        <span>
                          <span className="font-medium">{p.translit}</span>
                          <span className="ml-2 text-micro text-muted-foreground">{p.meaning}</span>
                        </span>
                        <span className="text-micro tabular-nums text-muted-foreground">{c}/{p.target}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* End-of-session summary — celebrates the effort without breaking flow. */}
      {summary && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-card border border-border bg-card p-6 shadow-elev-3 md:rounded-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-micro uppercase tracking-wider text-primary">Session complete</p>
                <h3 className="mt-1 text-heading font-semibold text-foreground">{summary.dhikr}</h3>
              </div>
              <button onClick={closeSummary} aria-label="Close summary" className="rounded-pill p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-card border border-border bg-background p-3">
                <p className="text-display font-bold tabular-nums text-foreground">{summary.counted}</p>
                <p className="mt-1 text-micro text-muted-foreground">Counted</p>
              </div>
              <div className="rounded-card border border-border bg-background p-3">
                <p className="text-display font-bold tabular-nums text-foreground">
                  {Math.max(1, Math.round(summary.durationMs / 60000))}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">min</span>
                </p>
                <p className="mt-1 text-micro text-muted-foreground">Focused</p>
              </div>
              <div className="rounded-card border border-border bg-background p-3">
                <p className="text-display font-bold tabular-nums text-foreground">{summary.streak}</p>
                <p className="mt-1 text-micro text-muted-foreground">Day streak</p>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Barakallahu feek — may Allah accept your dhikr.
            </p>
            <button
              onClick={closeSummary}
              className="mt-5 inline-flex w-full items-center justify-center rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dhikr;
