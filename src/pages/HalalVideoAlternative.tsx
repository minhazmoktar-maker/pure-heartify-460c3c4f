import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Shield, Sparkles, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * High-intent SEO landing page: people searching for a halal alternative to
 * YouTube / a halal video platform. Positioning stays on Heartify's own terms
 * (reviewed, beneficial knowledge) — the comparison explains what changes when
 * you switch, without claiming to be "a halal YouTube".
 */

const DIFFERENCES: Array<{ topic: string; mainstream: string; heartify: string }> = [
  {
    topic: "What gets in",
    mainstream: "Anything uploaded, filtered only after complaints",
    heartify: "Every video passes a review before it can be served — no music, no mixed-gender or immodest imagery",
  },
  {
    topic: "What the feed optimises for",
    mainstream: "Watch time and session length",
    heartify: "Benefit per minute — we ask, 90 days later, whether a watch was actually worth it",
  },
  {
    topic: "Advertising",
    mainstream: "Ad-funded, so attention is the product",
    heartify: "No advertising at all — funded by membership, sadaqah and institutional licensing",
  },
  {
    topic: "Recommendations",
    mainstream: "Rabbit holes that pull you off-topic",
    heartify: "Topic shelves and lanes you can see and steer, with a rationale on each recommendation",
  },
  {
    topic: "Family safety",
    mainstream: "Kids apps are separate and still leak content",
    heartify: "Kids mode locks the whole app to reviewed child-safe content, autoplay off",
  },
  {
    topic: "Trust and audit",
    mainstream: "Moderation decisions are invisible",
    heartify: "Every video has a public attestation record you can inspect",
  },
];

const BEYOND = [
  { label: "Qur'an & tafsir", to: "/halal/quran" },
  { label: "Seerah & history", to: "/history" },
  { label: "Parenting & family", to: "/halal/parenting" },
  { label: "Language learning", to: "/learn" },
  { label: "Science & discovery", to: "/miracles" },
  { label: "Kids shows", to: "/guides/best-islamic-cartoons" },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Is there a halal alternative to YouTube?",
    a: "Heartify is a halal video platform built for that purpose. Instead of filtering a general-purpose video site after the fact, every channel and video is reviewed against a halal floor before it can appear anywhere in the app — feed, search, shorts or kids mode.",
  },
  {
    q: "Does Heartify remove music and immodest content?",
    a: "Yes. Background music, immodest imagery and mixed-gender entertainment are excluded by the review pipeline itself, not by a toggle a user can forget to switch on.",
  },
  {
    q: "Is it only religious lectures?",
    a: "No. Beneficial is broader than religious: history, science, entrepreneurship, productivity, language learning and children's content all belong here, provided they clear the same floor.",
  },
  {
    q: "Are there ads?",
    a: "None. Heartify is not advertising-funded, so there is no incentive to keep you scrolling. Membership, sadaqah and institutional licensing fund the platform.",
  },
  {
    q: "Is it free to use?",
    a: "Yes, you can browse and watch reviewed content for free. Membership adds extras such as offline downloads and supports the review work.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. Heartify is mobile-first and works in any browser; the Android app is available and iOS is on the way.",
  },
];

export default function HalalVideoAlternative() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title="Halal Alternative to YouTube — A Reviewed Halal Video Platform"
        description="Looking for a halal alternative to YouTube? Heartify is a halal video platform where every video is reviewed before it appears — no music, no immodest content, no ads, no watch-time algorithm."
        path="/halal-alternative-to-youtube"
        keywords="halal alternative to youtube, halal, halal videos, islam, islamic videos, quran, quran videos, prayer, salah videos, family, family safe video app, kids, islamic kids videos, halal video platform, muslim video platform"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Halal video", path: "/halal-video" },
          { name: "Halal alternative to YouTube", path: "/halal-alternative-to-youtube" },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <Navbar />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="mb-8">
          <div className="mb-2 inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Halal video platform
          </div>
          <h1 className="font-heading text-title font-bold tracking-tight text-foreground md:text-display">
            A halal alternative to YouTube
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            If you have been searching for a halal video platform your family can actually keep
            open, this is what Heartify does differently. Every channel and every video is reviewed
            against a halal floor before it can be served — no music, no immodest or mixed-gender
            content, no advertising, and a feed that is ranked by benefit rather than watch time.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/explore">
                Start watching reviewed videos
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/halal-video">Browse the halal video hub</Link>
            </Button>
          </div>
        </header>

        <section className="mb-10 rounded-card border border-border bg-card p-5">
          <div className="mb-2 inline-flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-primary">
            <Shield className="h-4 w-4" /> The short answer
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Mainstream video sites are general-purpose and ad-funded, so safety is something you bolt
            on afterwards with filters, extensions and supervision. Heartify starts from the
            opposite end: nothing reaches the app until it has cleared review, so search, shorts,
            recommendations and kids mode are all held to the same standard.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-heading font-semibold text-foreground">
            What changes when you switch
          </h2>
          <div className="space-y-3">
            {DIFFERENCES.map((d) => (
              <Card key={d.topic}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{d.topic}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Mainstream video sites: </span>
                      {d.mainstream}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Heartify: </span>
                      {d.heartify}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-heading font-semibold text-foreground">
            More than lectures — what you can watch
          </h2>
          <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
            A halal video platform is only a real replacement if it covers the whole household. These
            shelves are all reviewed to the same floor:
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BEYOND.map((b) => (
              <li key={b.to}>
                <Link
                  to={b.to}
                  className="block rounded-card border border-border/60 bg-card/40 px-4 py-3 text-sm font-medium transition hover:border-primary/40 hover:bg-card"
                >
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-heading font-semibold text-foreground">
            Questions people ask before switching
          </h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-card border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground">{f.q}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-6 text-center">
          <h2 className="text-heading font-semibold text-foreground">
            Try it with your family tonight
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Open the reviewed shelves, turn on Kids Mode for the children, and see whether an hour on
            Heartify leaves you with something you are glad you watched.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link to="/explore">Explore reviewed videos</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/trust">How review and moderation work</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
