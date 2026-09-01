import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import { KNOWLEDGE_HUBS, hubList } from "@/data/knowledgeHubs";

/**
 * Authoritative pillar hub (`/islamic-learning`, `/halal-video`,
 * `/quran-listening`). Unique title/description per hub, FAQPage + Article
 * JSON-LD, and dense internal links into the matching in-app surfaces.
 *
 * Each hub owns a top-level path, so the slug comes from the pathname when the
 * route is registered without a param.
 */
export default function KnowledgeHub() {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const { pathname } = useLocation();
  const slug = paramSlug ?? pathname.replace(/^\/+|\/+$/g, "");
  const hub = slug ? KNOWLEDGE_HUBS[slug] : undefined;

  if (!hub) return <NotFound />;

  const url = `https://heartifyapp.com/${hub.slug}`;
  const others = hubList().filter((h) => h.slug !== hub.slug);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title={hub.title}
        description={hub.description}
        path={`/${hub.slug}`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: hub.h1,
            description: hub.description,
            url,
            inLanguage: "en",
            isPartOf: { "@type": "WebSite", name: "Heartify", url: "https://heartifyapp.com" },
            publisher: {
              "@type": "Organization",
              name: "Heartify",
              url: "https://heartifyapp.com",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: hub.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <Navbar />

      <main className="mx-auto max-w-[820px] px-4 py-8 md:px-6 md:py-12">
        <p className="text-micro uppercase tracking-widest text-primary/80">{hub.kicker}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{hub.h1}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{hub.intro}</p>

        <div className="mt-10 space-y-10">
          {hub.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
              {s.links && s.links.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {s.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="inline-flex min-h-11 items-center rounded-full border border-border/60 bg-card/40 px-4 text-sm text-foreground transition hover:border-primary/40 hover:bg-card"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Common questions</h2>
          <dl className="mt-4 space-y-5">
            {hub.faq.map((f) => (
              <div key={f.q}>
                <dt className="font-medium text-foreground">{f.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12 border-t border-border pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Continue
          </h2>
          <ul className="mt-3 space-y-2">
            {others.map((h) => (
              <li key={h.slug}>
                <Link to={`/${h.slug}`} className="text-primary underline underline-offset-4">
                  {h.h1}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
