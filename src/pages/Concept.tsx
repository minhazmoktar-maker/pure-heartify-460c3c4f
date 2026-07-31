import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useConcept } from "@/hooks/useConcepts";
import { ArrowRight, ShieldCheck } from "lucide-react";

const BASE = "https://pure-heartify.lovable.app";

function thumb(videoId: string, url: string | null) {
  return url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * MVP-3 — Concept page: prerequisite ladder, what it unlocks,
 * and reviewed video segments that teach the concept.
 */
export default function Concept() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useConcept(slug);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-[1000px] px-4 py-8 md:px-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isError || !data?.concept) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-[800px] px-4 py-16 text-center md:px-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Concept not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This concept may have been renamed or unpublished.
          </p>
          <Link
            to="/learn"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Browse the knowledge map
          </Link>
        </main>
      </div>
    );
  }

  const { concept, prerequisites, unlocks, segments } = data;
  const path = `/learn/${concept.slug}`;

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${concept.title} — Heartify knowledge map`}
        description={
          concept.summary ??
          `Learn ${concept.title} with reviewed lessons and its prerequisite ladder on Heartify.`
        }
        path={path}
        type="article"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Learn", path: "/learn" },
          { name: concept.title, path },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: concept.title,
          description: concept.summary ?? undefined,
          url: `${BASE}${path}`,
          educationalLevel: `Level ${concept.level}`,
          about: concept.domain,
          teaches: concept.title,
          hasPart: segments.slice(0, 10).map((s) => ({
            "@type": "VideoObject",
            name: s.title ?? concept.title,
            url: `${BASE}/watch/${s.video_id}`,
          })),
        }}
      />
      <Navbar />
      <main className="mx-auto max-w-[1000px] px-4 pb-24 pt-6 md:px-6 md:pt-10">
        <nav className="mb-3 text-micro text-muted-foreground">
          <Link to="/learn" className="hover:text-foreground">
            Learn
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{concept.domain}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{concept.domain}</Badge>
          <Badge variant="outline">Level {concept.level}</Badge>
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {concept.title}
        </h1>
        {concept.arabic_term ? (
          <p dir="rtl" className="mt-1 text-xl text-muted-foreground">
            {concept.arabic_term}
          </p>
        ) : null}
        {concept.summary ? (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            {concept.summary}
          </p>
        ) : null}

        {prerequisites.length > 0 ? (
          <section className="mt-8" aria-labelledby="prereqs">
            <h2 id="prereqs" className="text-lg font-semibold text-foreground">
              Understand these first
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {prerequisites.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/learn/${p.slug}`}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm text-foreground transition-colors hover:border-primary/40"
                  >
                    {p.title}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10" aria-labelledby="lessons">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="lessons" className="text-lg font-semibold text-foreground">
              Reviewed lessons
            </h2>
            <span className="inline-flex items-center gap-1 text-micro text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Every lesson passed Heartify review
            </span>
          </div>
          {segments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              We are still curating lessons for this concept.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {segments.map((s) => (
                <li key={`${s.video_id}-${s.start_seconds ?? 0}`}>
                  <Link
                    to={`/watch/${s.video_id}${s.start_seconds ? `?t=${s.start_seconds}` : ""}`}
                    className="group block"
                  >
                    <div className="overflow-hidden rounded-xl border border-border bg-muted">
                      <img
                        src={thumb(s.video_id, s.thumbnail_url)}
                        alt={s.title ?? concept.title}
                        width={480}
                        height={270}
                        loading="lazy"
                        className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">
                      {s.title ?? "Lesson"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.channel_title ?? "Heartify library"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {unlocks.length > 0 ? (
          <section className="mt-10" aria-labelledby="next">
            <h2 id="next" className="text-lg font-semibold text-foreground">
              Next in the ladder
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {unlocks.map((n) => (
                <li key={n.slug}>
                  <Link
                    to={`/learn/${n.slug}`}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm text-foreground transition-colors hover:border-primary/40"
                  >
                    {n.title}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
