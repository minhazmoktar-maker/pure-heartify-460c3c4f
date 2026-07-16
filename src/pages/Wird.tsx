import { localToday } from "@/lib/intl";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Play, Check, RotateCcw, ListPlus, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { toast } from "sonner";

type WirdItem = { id: string; arabic: string; translit: string; meaning: string; target: number };
type Wird = { id: string; name: string; items: WirdItem[]; createdAt: number };

const KEY = "wird:list";
const LOG_KEY = "wird:log";

const PRESET_ITEMS: Omit<WirdItem, "id" | "target">[] = [
  { arabic: "سُبْحَانَ اللَّهِ", translit: "SubhanAllah", meaning: "Glory be to Allah" },
  { arabic: "الْحَمْدُ لِلَّهِ", translit: "Alhamdulillah", meaning: "All praise is due to Allah" },
  { arabic: "اللَّهُ أَكْبَرُ", translit: "Allahu Akbar", meaning: "Allah is the Greatest" },
  { arabic: "لَا إِلَٰهَ إِلَّا اللَّهُ", translit: "La ilaha illa Allah", meaning: "There is no god but Allah" },
  { arabic: "أَسْتَغْفِرُ اللَّهَ", translit: "Astaghfirullah", meaning: "I seek Allah's forgiveness" },
  { arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّد", translit: "Allahumma salli 'ala Muhammad", meaning: "O Allah, send peace upon Muhammad" },
  { arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", translit: "La hawla wa la quwwata illa billah", meaning: "There is no power except with Allah" },
  { arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", translit: "SubhanAllahi wa bihamdih", meaning: "Glory to Allah and His praise" },
];

function loadWirds(): Wird[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function saveWirds(w: Wird[]) { localStorage.setItem(KEY, JSON.stringify(w)); }

function loadLog(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "{}"); } catch { return {}; }
}
function saveLog(v: Record<string, string[]>) { localStorage.setItem(LOG_KEY, JSON.stringify(v)); }

const todayKey = () => localToday();

const uid = () => Math.random().toString(36).slice(2, 10);

const Wird = () => {
  const [wirds, setWirds] = useState<Wird[]>(loadWirds);
  const [log, setLog] = useState<Record<string, string[]>>(loadLog);
  const [running, setRunning] = useState<Wird | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<WirdItem[]>([]);

  useEffect(() => saveWirds(wirds), [wirds]);
  useEffect(() => saveLog(log), [log]);

  const addPreset = (i: number) => {
    const p = PRESET_ITEMS[i];
    setDrafts((d) => [...d, { ...p, id: uid(), target: 33 }]);
  };
  const addCustom = () => {
    setDrafts((d) => [...d, { id: uid(), arabic: "", translit: "", meaning: "", target: 33 }]);
  };
  const updateDraft = (id: string, patch: Partial<WirdItem>) => {
    setDrafts((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id));

  const createWird = () => {
    if (!newName.trim() || drafts.length === 0) {
      toast.error("Add a name and at least one dhikr");
      return;
    }
    const w: Wird = { id: uid(), name: newName.trim(), items: drafts, createdAt: Date.now() };
    setWirds((ws) => [w, ...ws]);
    setNewName("");
    setDrafts([]);
    toast.success("Wird saved");
  };

  const deleteWird = (id: string) => setWirds((ws) => ws.filter((w) => w.id !== id));

  const startWird = (w: Wird) => {
    setRunning(w);
    setCounts(Object.fromEntries(w.items.map((i) => [i.id, 0])));
  };
  const bump = (id: string, target: number) => {
    setCounts((c) => ({ ...c, [id]: Math.min(target, (c[id] || 0) + 1) }));
    if (navigator.vibrate) navigator.vibrate(10);
  };
  const resetRunning = () => running && setCounts(Object.fromEntries(running.items.map((i) => [i.id, 0])));

  const allDone = running && running.items.every((i) => (counts[i.id] || 0) >= i.target);

  useEffect(() => {
    if (running && allDone) {
      const k = todayKey();
      setLog((l) => {
        const set = new Set(l[k] || []);
        set.add(running.id);
        return { ...l, [k]: [...set] };
      });
      toast.success(`Completed “${running.name}” — barakAllahu feek`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const doneToday = log[todayKey()] || [];

  const totalReps = useMemo(
    () => Object.values(log).flat().length,
    [log],
  );

  if (running) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="font-heading text-title font-bold text-foreground">{running.name}</h1>
              <p className="text-sm text-muted-foreground">Tap each card to count. Reach the target for each.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={resetRunning} className="rounded-pill border border-border p-2 hover:bg-secondary" aria-label="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={() => setRunning(null)} className="rounded-pill border border-border px-3 py-1 text-sm hover:bg-secondary">
                Done
              </button>
            </div>
          </div>

          <ol className="space-y-3">
            {running.items.map((it) => {
              const c = counts[it.id] || 0;
              const done = c >= it.target;
              const pct = Math.round((c / it.target) * 100);
              return (
                <li key={it.id}>
                  <button
                    onClick={() => bump(it.id, it.target)}
                    disabled={done}
                    className={`w-full rounded-card border p-5 text-left transition ${
                      done ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p dir="rtl" className="font-heading text-title text-foreground">{it.arabic}</p>
                        <p className="mt-1 text-sm italic text-muted-foreground">{it.translit}</p>
                        <p className="text-micro text-muted-foreground">{it.meaning}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-title font-bold tabular-nums ${done ? "text-primary" : "text-foreground"}`}>
                          {c}<span className="text-base text-muted-foreground">/{it.target}</span>
                        </div>
                        {done && <Check className="ml-auto mt-1 h-5 w-5 text-primary" />}
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-secondary">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Wird Builder — Custom Daily Dhikr Routines | Heartify"
        description="Build your own wird from classic adhkar or custom entries. Track each dhikr's count, complete a session, and record it privately on-device."
        path="/wird"
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <header className="mb-6 flex items-start gap-3">
          <div className="rounded-card bg-primary/10 p-3 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-title font-bold text-foreground md:text-display">Wird Builder</h1>
            <p className="mt-1 text-muted-foreground">Assemble your daily awrad. Save, run, and repeat.</p>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-card border border-border bg-card p-4">
            <p className="text-micro text-muted-foreground">Saved awrad</p>
            <p className="font-heading text-title font-bold text-foreground">{wirds.length}</p>
          </div>
          <div className="rounded-card border border-border bg-card p-4">
            <p className="text-micro text-muted-foreground">Completed today</p>
            <p className="font-heading text-title font-bold text-primary">{doneToday.length}</p>
          </div>
          <div className="rounded-card border border-border bg-card p-4">
            <p className="text-micro text-muted-foreground">Total sessions</p>
            <p className="font-heading text-title font-bold text-foreground">{totalReps}</p>
          </div>
        </section>

        {/* Existing wirds */}
        {wirds.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-heading text-heading font-semibold text-foreground">Your awrad</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {wirds.map((w) => {
                const done = doneToday.includes(w.id);
                return (
                  <div key={w.id} className={`rounded-card border p-4 ${done ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold text-foreground">{w.name}</h3>
                        <p className="text-micro text-muted-foreground">
                          {w.items.length} items · {w.items.reduce((s, i) => s + i.target, 0)} reps total
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startWird(w)} className="rounded-pill bg-primary p-2 text-primary-foreground hover:opacity-90" aria-label="Start">
                          <Play className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteWird(w.id)} className="rounded-pill p-2 text-muted-foreground hover:bg-secondary" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {done && <p className="mt-2 text-micro font-medium text-primary">Completed today ✓</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Builder */}
        <section className="rounded-card border border-border bg-card p-5">
          <h2 className="mb-3 font-heading text-heading font-semibold text-foreground">Build a new wird</h2>
          <input
            type="text"
            placeholder="Name (e.g. Morning wird, After Fajr)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mb-4 h-11 w-full rounded-card border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          />

          <div className="mb-4">
            <p className="mb-2 text-micro font-medium uppercase tracking-wide text-muted-foreground">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_ITEMS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => addPreset(i)}
                  className="inline-flex items-center gap-1 rounded-pill border border-border bg-background px-3 py-1 text-micro hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" /> {p.translit}
                </button>
              ))}
              <button
                onClick={addCustom}
                className="inline-flex items-center gap-1 rounded-pill border border-dashed border-border bg-background px-3 py-1 text-micro hover:border-primary hover:text-primary"
              >
                <ListPlus className="h-3 w-3" /> Custom
              </button>
            </div>
          </div>

          {drafts.length > 0 && (
            <ul className="mb-4 space-y-2">
              {drafts.map((d) => (
                <li key={d.id} className="rounded-card border border-border bg-background p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_100px_auto]">
                    <input
                      dir="rtl"
                      placeholder="Arabic"
                      value={d.arabic}
                      onChange={(e) => updateDraft(d.id, { arabic: e.target.value })}
                      className="h-9 rounded-card border border-border bg-card px-2 text-sm"
                    />
                    <input
                      placeholder="Transliteration"
                      value={d.translit}
                      onChange={(e) => updateDraft(d.id, { translit: e.target.value })}
                      className="h-9 rounded-card border border-border bg-card px-2 text-sm"
                    />
                    <input
                      placeholder="Meaning"
                      value={d.meaning}
                      onChange={(e) => updateDraft(d.id, { meaning: e.target.value })}
                      className="h-9 rounded-card border border-border bg-card px-2 text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      value={d.target}
                      onChange={(e) => updateDraft(d.id, { target: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-9 rounded-card border border-border bg-card px-2 text-sm"
                    />
                    <button onClick={() => removeDraft(d.id)} className="rounded-card p-2 text-muted-foreground hover:bg-secondary" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={createWird}
            className="w-full rounded-card bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Save wird
          </button>
        </section>
      </main>
    </div>
  );
};

export default Wird;
