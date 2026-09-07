import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlaySquare, Shield, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import { Button } from "@/components/ui/button";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { HALAL_TOPICS, halalTopicList } from "@/data/halalTopics";

/**
 * Halal video hub — the browsing entry point linked from
 * /halal-alternative-to-youtube. Two real surfaces: a filtered short-form rail
 * (the same reviewed corpus that powers /shorts) and the reviewed topic
 * playlists. No new data sources, no ranking changes.
 */

const SHORT_RE = /(shorts?|60 ?sec|1[- ]?min|reminder|quick|daily)/i;

const PATH = "/halal-videos";

export default function HalalVideoHub() {
  const { data, isLoading } = useYouTubeVideos("All");
  const topics = halalTopicList();

  const shorts = useMemo(() => {
    const all = data ?? [];
    const short = all.filter((v) => SHORT_RE.test(v.title));
    const rest = all.filter((v) => !SHORT_RE.test(v.title));
    return [...short, ...rest].slice(0, 16);
  }, [data]);

  const playlists = useMemo(() => {
    const all = data ?? [];
    return topics.map((t) => {
      const topic = HALAL_TOPICS[t.slug];
      return {
        slug: t.slug,
        title: topic.kicker,
        heading: t.title,
        description: t.description,
        count: all.filter((v) => v.category === topic.category).length,
      };
    });
  }, [data, topics]);


  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Halal Video Hub — Reviewed Shorts & Playlists · Heartify"
        description="Browse the halal video hub: reviewed halal Shorts and Islamic playlists covering Qur'an, prayer, family, kids and learning. No music, no immodest content, no ads."
        path={PATH}
        keywords="halal videos, halal shorts, islam videos, quran videos, prayer videos, islamic playlists, family safe videos, kids islamic videos, muslim video hub"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Halal alternative to YouTube", path: "/halal-alternative-to-youtube" },
          { name: "Halal video hub", path: PATH },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Halal video hub",
          url: `https://heartifyapp.com${PATH}`,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: playlists.length,
            itemListElement: playlists.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://heartifyapp.com/halal/${p.slug}`,
              name: p.heading,
            })),
          },
        }}
      />
      <Navbar />
      <main id="main-content" className="mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10">
        <header className="mb-8">
          <div className="mb-2 inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" aria-hidden /> Reviewed before it is served
          </div>
          <h1 className="font-heading text-title font-bold tracking-tight text-foreground md:text-display">
            Halal video hub
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Everything here has cleared Heartify's halal review — Islam, Qur'an, prayer, family and
            kids content included. Start with a short reminder, or open a full playlist and stay with
            one topic.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/shorts">
                Watch halal Shorts
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/halal-alternative-to-youtube">Why this replaces YouTube</Link>
            </Button>
          </div>
        </header>

        <section className="mb-12" aria-labelledby="halal-shorts">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="halal-shorts" className="inline-flex items-center gap-2 text-heading font-semibold text-foreground">
              <Zap className="h-5 w-5 text-primary" aria-hidden /> Halal Shorts
            </h2>
            <Link to="/shorts" className="text-sm text-primary hover:underline">
              Open Shorts
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-card bg-muted" />
              ))}
            </div>
          ) : shorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviewed shorts available right now — new ones land daily.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shorts.map((v, i) => (
                <YouTubeVideoCard key={v.id} video={v} index={i} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="halal-playlists">
          <h2 id="halal-playlists" className="mb-2 inline-flex items-center gap-2 text-heading font-semibold text-foreground">
            <PlaySquare className="h-5 w-5 text-primary" aria-hidden /> Reviewed playlists
          </h2>
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
            Each playlist is a reviewed shelf: Qur'an and tafsir, prayer and worship, parenting and
            family, kids shows, Islamic history and learning.
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p) => (
              <li key={p.slug}>
                <Link
                  to={`/halal/${p.slug}`}
                  className="block h-full rounded-card border border-border/60 bg-card/40 p-4 transition hover:border-primary/40 hover:bg-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-micro uppercase tracking-widest text-primary/80">
                      {p.title}
                    </span>
                    {p.count > 0 ? (
                      <span className="text-micro text-muted-foreground">{p.count} videos</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-base font-semibold text-foreground">{p.heading}</div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Button asChild size="sm" variant="outline">
              <Link to="/halal">See all halal topics</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
