import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { HALAL_TOPICS, halalTopicList } from "@/data/halalTopics";

/**
 * R4 — Programmatic-SEO hub that indexes every /halal/:slug landing.
 * Gives crawlers a single entry point that links to all topic pages.
 */
export default function HalalHub() {
  const topics = halalTopicList();
  const path = "/halal";
  const url = `https://pure-heartify.lovable.app${path}`;

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Halal Video Topics — Reviewed Islamic Content · Heartify"
        description="Browse Heartify's reviewed halal video shelves — Qur'an, Seerah, parenting, learning, history, motivation, and more."
        path={path}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Halal video topics",
          url,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: topics.length,
            itemListElement: topics.map((t, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://pure-heartify.lovable.app/halal/${t.slug}`,
              name: t.title,
            })),
          },
        }}
      />
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 py-8 md:px-6 md:py-12">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Halal video topics
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every shelf below is reviewed by Heartify Editors — no music, no
          mixed-gender content, no engagement bait. Pick a topic to browse
          the reviewed videos in that category.
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <li key={t.slug}>
              <Link
                to={`/halal/${t.slug}`}
                className="block rounded-card border border-border/60 bg-card/40 p-4 transition hover:border-primary/40 hover:bg-card"
              >
                <div className="text-micro uppercase tracking-widest text-primary/80">
                  {HALAL_TOPICS[t.slug].kicker}
                </div>
                <div className="mt-1 text-base font-semibold text-foreground">
                  {t.title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {t.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
