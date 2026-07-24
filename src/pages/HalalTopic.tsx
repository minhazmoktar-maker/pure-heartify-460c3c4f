import { useParams, Navigate, Link } from "react-router-dom";
import { useMemo } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import EditorByline from "@/components/EditorByline";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { HALAL_TOPICS } from "@/data/halalTopics";

/**
 * Wave 2 + R4 — Programmatic-SEO topic landing.
 * URL pattern: /halal/:slug (e.g. /halal/quran, /halal/parenting).
 * Topic catalog lives in `src/data/halalTopics.ts` so the sitemap
 * generator and the /halal hub stay in sync with this page.
 */


export default function HalalTopic() {
  const { slug } = useParams<{ slug: string }>();
  const key = (slug ?? "").toLowerCase();
  const topic = HALAL_TOPICS[key];
  const { data: videos, isLoading } = useYouTubeVideos(topic?.category ?? "All");

  const items = useMemo(() => (videos ?? []).slice(0, 48), [videos]);

  if (!topic) return <Navigate to="/explore" replace />;

  const path = `/halal/${key}`;
  const url = `https://pure-heartify.lovable.app${path}`;

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${topic.title} · Heartify`}
        description={topic.description}
        path={path}
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: topic.title,
          description: topic.description,
          url,
          isPartOf: {
            "@type": "WebSite",
            name: "Heartify",
            url: "https://pure-heartify.lovable.app/",
          },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: items.length,
            itemListElement: items.slice(0, 20).map((v, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://pure-heartify.lovable.app/watch/${v.id}`,
              name: v.title,
            })),
          },
        }}
      />
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-10">
        <nav className="mb-3 text-micro text-muted-foreground">
          <Link to="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Halal {topic.kicker}</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {topic.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          {topic.description}
        </p>
        <div className="mt-4 max-w-xl">
          <EditorByline
            editor="Heartify Editors"
            role="Editorial Team"
            reason={topic.reason}
            updatedAt={new Date().toISOString()}
          />
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Reviewed videos in {topic.kicker}
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-card bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No videos yet in this shelf. Check back soon — new content lands daily.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((v, i) => (
                <YouTubeVideoCard key={v.id} video={v} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
