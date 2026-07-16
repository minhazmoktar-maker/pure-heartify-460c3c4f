import { Link } from "react-router-dom";
import { ArrowLeft, PlayCircle, BookOpen, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Series = {
  slug: string;
  title: string;
  year: string;
  episodes: string;
  summary: string;
  themes: string[];
  watchOrder: number;
};

const SERIES: Series[] = [
  {
    slug: "the-firsts",
    title: "The Firsts",
    year: "Ramadan 2020 →",
    episodes: "30+ episodes",
    summary:
      "Stories of the first generation of Muslims — the men and women who first prayed, first migrated, first believed. A signature Yaqeen Institute series and the flagship starting point.",
    themes: ["Companions", "Sacrifice", "Early Islam"],
    watchOrder: 1,
  },
  {
    slug: "angels-in-your-presence",
    title: "Angels in Your Presence",
    year: "Ramadan 2021",
    episodes: "30 episodes",
    summary:
      "A daily deep-dive into the unseen world of the angels — Jibrīl, Mīkā'īl, Isrāfīl, the recording angels, and the ones who surround gatherings of dhikr.",
    themes: ["Ghayb", "Iman", "Malaʾikah"],
    watchOrder: 2,
  },
  {
    slug: "the-final-moments",
    title: "The Final Moments",
    year: "Ramadan 2022",
    episodes: "30 episodes",
    summary:
      "Reflections on the last words, breaths, and deeds of the righteous — how to live in a way that dignifies how you die.",
    themes: ["Mortality", "Legacy", "Tazkiyah"],
    watchOrder: 3,
  },
  {
    slug: "allahs-plan",
    title: "Allah's Plan Is Better",
    year: "Ramadan 2023",
    episodes: "30 episodes",
    summary:
      "A tour of qadar through the lives of prophets and Companions — surrendering to what Allah decreed and finding the wisdom in delay, loss, and redirection.",
    themes: ["Qadar", "Tawakkul", "Sabr"],
    watchOrder: 4,
  },
  {
    slug: "quran-30-for-30",
    title: "Qur'an 30 for 30",
    year: "Every Ramadan",
    episodes: "30 nightly tafsir sessions",
    summary:
      "A juz-per-night companion series where Dr. Omar Suleiman is joined by leading scholars to unpack each juz of the Qur'an during Ramadan.",
    themes: ["Tafsir", "Qur'an", "Ramadan nightly"],
    watchOrder: 5,
  },
];

export default function OmarSuleimanRamadanSeries() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title="Omar Suleiman Ramadan Series — Watch Order Guide | Heartify"
        description="A curated watch-order guide to Dr. Omar Suleiman's Ramadan series — The Firsts, Angels in Your Presence, The Final Moments, Allah's Plan, and Qur'an 30 for 30 — with summaries and themes."
        path="/guides/omar-suleiman-ramadan-series"
        keywords="Omar Suleiman Ramadan series, The Firsts, Yaqeen Institute Ramadan, Qur'an 30 for 30"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Omar Suleiman Ramadan Series — Watch Order",
          numberOfItems: SERIES.length,
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          itemListElement: SERIES.map((s) => ({
            "@type": "ListItem",
            position: s.watchOrder,
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
            <Sparkles className="h-4 w-4 text-primary" /> Curated guide
          </div>
          <h1 className="font-heading text-title font-bold tracking-tight text-foreground md:text-display">
            Omar Suleiman's Ramadan Series — Watch Order
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            A guided learning path through Dr. Omar Suleiman's annual Ramadan series. Start with{" "}
            <em>The Firsts</em> for foundational Companion stories, then move through the yearly
            themes in the order below. Each series stands on its own — pick any starting point that
            matches where your heart is this Ramadan.
          </p>
        </header>

        <div className="space-y-4">
          {SERIES.map((s) => (
            <Card key={s.slug} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 text-micro font-semibold uppercase tracking-wide text-primary">
                      Step {s.watchOrder}
                    </div>
                    <CardTitle className="text-heading">{s.title}</CardTitle>
                    <p className="mt-0.5 text-micro text-muted-foreground">
                      {s.year} · {s.episodes}
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
                  <Link to={`/search?q=${encodeURIComponent("Omar Suleiman " + s.title)}`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Find episodes on Heartify
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-10 rounded-card border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">How to use this guide</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ramadan rewards consistency over volume. Pick one series and commit to a single episode
            after Fajr or before Iftar each day. Bookmark verses that move you and revisit them on
            the last ten nights. Every series here is filtered through Heartify's halal-only content
            pipeline.
          </p>
        </section>
      </main>
    </div>
  );
}
