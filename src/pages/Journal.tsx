import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookMarked, Plus, Trash2, Heart, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { toast } from "sonner";

type Entry = {
  id: string;
  date: string; // YYYY-MM-DD
  type: "intention" | "gratitude" | "reflection";
  text: string;
  createdAt: number;
};

const STORAGE_KEY = "journal:entries";

const loadEntries = (): Entry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch {
    return [];
  }
};

const saveEntries = (entries: Entry[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* noop */
  }
};

const typeMeta: Record<Entry["type"], { label: string; icon: typeof Sparkles; color: string; hint: string }> = {
  intention: {
    label: "Niyyah (Intention)",
    icon: Sparkles,
    color: "text-primary",
    hint: "What is your intention for today? A pure niyyah transforms habits into worship.",
  },
  gratitude: {
    label: "Gratitude (Shukr)",
    icon: Heart,
    color: "text-[hsl(var(--gold))]",
    hint: "What blessing are you grateful to Allah for today?",
  },
  reflection: {
    label: "Reflection (Tafakkur)",
    icon: BookMarked,
    color: "text-primary",
    hint: "A verse, hadith, or moment that struck your heart today.",
  },
};

const today = () => new Date().toISOString().slice(0, 10);

const Journal = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [type, setType] = useState<Entry["type"]>("intention");
  const [text, setText] = useState("");

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const addEntry = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Write a few words first.");
      return;
    }
    const entry: Entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: today(),
      type,
      text: trimmed,
      createdAt: Date.now(),
    };
    const next = [entry, ...entries];
    setEntries(next);
    saveEntries(next);
    setText("");
    toast.success("Saved — may Allah accept it.");
  };

  const removeEntry = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveEntries(next);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  const stats = useMemo(() => {
    const days = new Set(entries.map((e) => e.date)).size;
    const byType = entries.reduce(
      (acc, e) => {
        acc[e.type] += 1;
        return acc;
      },
      { intention: 0, gratitude: 0, reflection: 0 } as Record<Entry["type"], number>,
    );
    return { total: entries.length, days, byType };
  }, [entries]);

  const meta = typeMeta[type];

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Journal — Intentions, Gratitude & Reflection | Heartify"
        description="A private journal for niyyah, shukr, and tafakkur. Turn everyday moments into worship."
        path="/journal"
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <BookMarked className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">Journal</h1>
            <p className="text-sm text-muted-foreground">Private niyyah, shukr, and tafakkur — stored on this device.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="font-heading text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Entries</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="font-heading text-2xl font-bold text-foreground">{stats.days}</div>
            <div className="text-xs text-muted-foreground">Days written</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="font-heading text-2xl font-bold text-foreground">{stats.byType.gratitude}</div>
            <div className="text-xs text-muted-foreground">Gratitude notes</div>
          </div>
        </div>

        {/* Composer */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(typeMeta) as Entry["type"][]).map((t) => {
              const Icon = typeMeta[t].icon;
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {typeMeta[t].label}
                </button>
              );
            })}
          </div>
          <p className="mb-3 text-xs italic text-muted-foreground">{meta.hint}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="Write from the heart…"
            className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{text.length}/600</span>
            <button
              onClick={addEntry}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Save entry
            </button>
          </div>
        </div>

        {/* Entries */}
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <BookMarked className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Your journal is empty. Start with a small niyyah for today.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, list]) => (
              <section key={date}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {new Date(date).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
                <div className="space-y-2">
                  {list.map((e) => {
                    const m = typeMeta[e.type];
                    const Icon = m.icon;
                    return (
                      <article key={e.id} className="group rounded-xl border border-border bg-card p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {m.label}
                          </div>
                          <button
                            onClick={() => removeEntry(e.id)}
                            aria-label="Delete entry"
                            className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground">{e.text}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Journal;
