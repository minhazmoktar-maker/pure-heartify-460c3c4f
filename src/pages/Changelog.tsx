import { useEffect } from "react";
import { Sparkles, Wrench, Bug } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import FadeIn from "@/components/FadeIn";
import { CHANGELOG, markChangelogSeen } from "@/data/changelog";

const TAG_META = {
  new: { label: "New", icon: Sparkles, className: "bg-primary/10 text-primary" },
  improved: { label: "Improved", icon: Wrench, className: "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]" },
  fixed: { label: "Fixed", icon: Bug, className: "bg-muted text-muted-foreground" },
} as const;

export default function Changelog() {
  useEffect(() => { markChangelogSeen(); }, []);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="What's new in Heartify — changelog"
        description="Every meaningful update to Heartify — new features, improvements, and fixes, in reverse-chronological order."
        path="/changelog"
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <header className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">What's new</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The latest updates to Heartify. Newest first.
          </p>
        </header>

        <ol className="relative space-y-6 border-l border-border pl-6">
          {CHANGELOG.map((entry, i) => {
            const meta = TAG_META[entry.tag ?? "new"];
            const Icon = meta.icon;
            return (
              <FadeIn key={entry.id} index={i} as="li" className="relative">
                <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-primary/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <article className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <time className="text-xs uppercase tracking-wide text-muted-foreground" dateTime={entry.date}>
                      {new Date(entry.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </time>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-foreground">{entry.title}</h2>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {entry.bullets.map((b, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </FadeIn>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
