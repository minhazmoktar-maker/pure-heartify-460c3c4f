import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConceptCatalog, groupByDomain } from "@/hooks/useConcepts";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { ChevronRight } from "lucide-react";

/**
 * MVP-3 — Knowledge graph browse surface.
 * Lists the curated concept curriculum by domain and links into
 * each concept's learning ladder at /learn/:slug.
 */
export default function Learn() {
  const { data, isLoading } = useConceptCatalog();
  const { data: paths, isLoading: pathsLoading } = useLearningPaths();
  const [q, setQ] = useState("");

  const domains = useMemo(() => {
    const all = data ?? [];
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? all.filter(
          (c) =>
            c.title.toLowerCase().includes(needle) ||
            (c.arabic_term ?? "").toLowerCase().includes(needle) ||
            c.domain.toLowerCase().includes(needle),
        )
      : all;
    return groupByDomain(filtered);
  }, [data, q]);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Learn — the Heartify knowledge map"
        description="A curated map of 500 Islamic and beneficial-knowledge concepts, each with prerequisites and reviewed video lessons."
        path="/learn"
        type="website"
      />
      <Navbar />
      <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 md:px-6 md:pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          The knowledge map
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Every concept is ordered by what you need to understand first, and
          linked to reviewed lessons from the Heartify library.
        </p>

        <div className="mt-6 max-w-md">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search concepts, e.g. tawheed, sabr, wudu"
            aria-label="Search concepts"
            className="h-11"
          />
        </div>

        {isLoading ? (
          <div className="mt-10 space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <Skeleton key={j} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : domains.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            No concepts match “{q}”.
          </p>
        ) : (
          <div className="mt-10 space-y-10">
            {domains.map(([domain, concepts]) => (
              <section key={domain} aria-labelledby={`domain-${domain}`}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2
                    id={`domain-${domain}`}
                    className="text-lg font-semibold text-foreground"
                  >
                    {domain}
                  </h2>
                  <span className="text-micro text-muted-foreground">
                    {concepts.length} concepts
                  </span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {concepts.map((c) => (
                    <li key={c.slug}>
                      <Link
                        to={`/learn/${c.slug}`}
                        className="flex min-h-[76px] flex-col justify-center rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {c.title}
                          </span>
                          {c.arabic_term ? (
                            <span dir="rtl" className="text-sm text-muted-foreground">
                              {c.arabic_term}
                            </span>
                          ) : null}
                        </span>
                        {c.summary ? (
                          <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {c.summary}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
