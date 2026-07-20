import { Link } from "react-router-dom";
import { ArrowLeft, PlayCircle, Shield, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Show = {
  slug: string;
  title: string;
  ageRange: string;
  format: string;
  summary: string;
  themes: string[];
  rank: number;
};

const SHOWS: Show[] = [
  {
    slug: "omar-and-hana",
    title: "Omar & Hana",
    ageRange: "Ages 2–7",
    format: "Animated series · short episodes",
    summary:
      "A beloved animated series about a Muslim brother and sister learning Islamic manners, duas, and Qur'an through catchy songs. Widely regarded as one of the best Islamic cartoons for young children — a gentle first introduction to daily worship and akhlaq.",
    themes: ["Duas", "Akhlaq", "Family"],
    rank: 1,
  },
  {
    slug: "muslim-kids-tv",
    title: "Muslim Kids TV",
    ageRange: "Ages 3–12",
    format: "Streaming library · multiple shows",
    summary:
      "A large curated library of Islamic cartoons, nasheeds without music, prophet stories, and educational shows made specifically for Muslim families. A trusted go-to for parents looking for safe, halal-first content across a wide age range.",
    themes: ["Prophet stories", "Educational", "Halal-first"],
    rank: 2,
  },
  {
    slug: "one-4-kids",
    title: "One 4 Kids (Zaky and friends)",
    ageRange: "Ages 3–10",
    format: "Animated series",
    summary:
      "The team behind Zaky, Kazwa, and other beloved Muslim characters. Focused on Islamic values, prophet stories, and gentle life lessons — an excellent complement to Omar & Hana for older children.",
    themes: ["Adab", "Seerah for kids", "Values"],
    rank: 3,
  },
  {
    slug: "little-explorers",
    title: "Little Explorers",
    ageRange: "Ages 4–9",
    format: "Animated adventure",
    summary:
      "An adventure-style series where young Muslim characters explore the world while learning about Allah's creation, science, and Islamic history. Great for curious kids who love exploration and discovery.",
    themes: ["Creation", "Science", "History"],
    rank: 4,
  },
  {
    slug: "ali-and-sumaya",
    title: "Ali & Sumaya",
    ageRange: "Ages 5–10",
    format: "Animated series",
    summary:
      "Two siblings navigate everyday situations — school, friends, family — while applying Islamic teachings. Practical, relatable episodes that help kids connect the deen to their own daily lives.",
    themes: ["Everyday Islam", "Siblings", "Values"],
    rank: 5,
  },
];

export default function BestIslamicCartoons() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title="Best Islamic Cartoons for Kids (2026) — Halal-Certified Guide | Heartify"
        description="A parent's guide to the best Islamic cartoons for kids — Omar & Hana, Muslim Kids TV, and more. Halal-certified, ad-free, and safe for young Muslim families."
        path="/guides/best-islamic-cartoons"
        keywords="best islamic cartoons, omar and hana, muslim kids tv, islamic cartoons for kids, halal cartoons, muslim kids shows"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Best Islamic Cartoons for Kids",
          numberOfItems: SHOWS.length,
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          itemListElement: SHOWS.map((s) => ({
            "@type": "ListItem",
            position: s.rank,
            name: s.title,
            description: s.summary,
          })),
        }}
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
            <Sparkles className="h-4 w-4 text-primary" /> Parent's guide
          </div>
          <h1 className="font-heading text-title font-bold tracking-tight text-foreground md:text-display">
            Best Islamic Cartoons for Kids in 2026
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            A curated guide for Muslim parents looking for safe, educational, and halal-certified
            cartoons for their children. Every show below is filtered through Heartify's kids-mode
            pipeline — no music, no inappropriate imagery, and no algorithmic rabbit holes. Start
            with <em>Omar &amp; Hana</em> for the youngest kids and expand from there.
          </p>
        </header>

        <section className="mb-8 rounded-card border border-border bg-card p-5">
          <div className="mb-2 inline-flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-primary">
            <Shield className="h-4 w-4" /> How we curate
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Every show on this list is reviewed for content authenticity, age-appropriate visuals,
            and alignment with Islamic values. We prioritize shows that teach duas, prophet stories,
            akhlaq (character), and everyday manners — the building blocks of a Muslim child's
            spiritual foundation.
          </p>
        </section>

        <div className="space-y-4">
          {SHOWS.map((s) => (
            <Card key={s.slug} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 text-micro font-semibold uppercase tracking-wide text-primary">
                      #{s.rank}
                    </div>
                    <CardTitle className="text-heading">{s.title}</CardTitle>
                    <p className="mt-0.5 text-micro text-muted-foreground">
                      {s.ageRange} · {s.format}
                    </p>
                  </div>
                  <PlayCircle className="h-6 w-6 shrink-0 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{s.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.themes.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                  <Link to={`/search?q=${encodeURIComponent(s.title)}`}>
                    Find episodes on Heartify
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-10 rounded-card border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">A word to parents</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Cartoons should complement — not replace — the seerah, Qur'an, and family time that
            forms a child's heart. Enable Heartify's Kids Mode from your profile to lock the feed to
            child-safe content, remove music-based shows, and turn off autoplay so screen time stays
            intentional.
          </p>
        </section>
      </main>
    </div>
  );
}
