import { useMemo, useState } from "react";
import { CheckCircle2, Circle, MapPin, Calendar, BookMarked } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { SEERAH_EVENTS, SEERAH_PHASES, type SeerahEvent } from "@/data/seerah";
import { toggleBookmark } from "@/lib/bookmarks";
import { toast } from "sonner";

const READ_KEY = "seerah:read";

function loadRead(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveRead(s: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...s]));
}

const phaseColor: Record<SeerahEvent["phase"], string> = {
  "Pre-Prophethood": "bg-muted text-muted-foreground",
  "Meccan": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Migration": "bg-primary/15 text-primary",
  "Medinan": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Final Years": "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]",
};

const Seerah = () => {
  const [read, setRead] = useState<Set<string>>(loadRead);
  const [phase, setPhase] = useState<SeerahEvent["phase"] | "All">("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEERAH_EVENTS.filter(
      (e) =>
        (phase === "All" || e.phase === phase) &&
        (!q || e.title.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q) || e.place.toLowerCase().includes(q)),
    );
  }, [phase, query]);

  const progress = Math.round((read.size / SEERAH_EVENTS.length) * 100);

  const toggle = (id: string) => {
    const next = new Set(read);
    next.has(id) ? next.delete(id) : next.add(id);
    setRead(next);
    saveRead(next);
  };

  const bookmark = (e: SeerahEvent) => {
    const added = toggleBookmark({
      id: `seerah:${e.id}`,
      kind: "dua",
      title: e.title,
      reference: `${e.year}${e.hijri ? ` · ${e.hijri}` : ""} · ${e.place}`,
      translation: e.summary,
      href: "/seerah",
    });
    toast.success(added ? "Bookmarked" : "Removed from bookmarks");
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Seerah Timeline — Life of the Prophet ﷺ | Heartify"
        description="Interactive timeline of the life of Prophet Muhammad ﷺ, from birth in Makkah through the Farewell Ḥajj — with progress tracking and bookmarks."
        path="/seerah"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Seerah Timeline",
          numberOfItems: SEERAH_EVENTS.length,
          itemListElement: SEERAH_EVENTS.map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: e.title,
            description: e.summary,
          })),
        }}
      />
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <h1 className="font-heading text-title font-bold text-foreground md:text-display">
            Seerah Timeline
          </h1>
          <p className="mt-2 text-muted-foreground">
            The life of the Prophet ﷺ, milestone by milestone. Mark events as read to track your progress.
          </p>
        </header>

        {/* Progress + filters */}
        <section className="mb-6 rounded-card border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {read.size} of {SEERAH_EVENTS.length} events read
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["All", ...SEERAH_PHASES] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className={`rounded-pill border px-3 py-1 text-micro font-medium transition ${
                  phase === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <input
            type="search"
            placeholder="Search events, places, keywords…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-3 h-10 w-full rounded-card border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          />
        </section>

        {/* Timeline */}
        <ol className="relative border-l-2 border-border pl-6">
          {filtered.map((e) => {
            const done = read.has(e.id);
            return (
              <li key={e.id} className="mb-6 last:mb-0">
                <span
                  className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-pill border-2 ${
                    done ? "border-primary bg-primary" : "border-border bg-background"
                  }`}
                  aria-hidden
                />
                <article className="rounded-card border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-micro text-muted-foreground">
                        <span className={`rounded-pill px-2 py-0.5 font-medium ${phaseColor[e.phase]}`}>{e.phase}</span>
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{e.year}{e.hijri ? ` · ${e.hijri}` : ""}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.place}</span>
                      </div>
                      <h2 className="font-heading text-heading font-semibold text-foreground">{e.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{e.summary}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => bookmark(e)}
                        aria-label="Bookmark"
                        className="rounded-pill p-2 hover:bg-secondary"
                        title="Bookmark"
                      >
                        <BookMarked className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => toggle(e.id)}
                        aria-label={done ? "Mark as unread" : "Mark as read"}
                        className="rounded-pill p-2 hover:bg-secondary"
                        title={done ? "Mark as unread" : "Mark as read"}
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No events match your filters.
            </li>
          )}
        </ol>
      </main>
    </div>
  );
};

export default Seerah;
