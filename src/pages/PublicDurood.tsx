import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Heart, ChevronLeft, ChevronRight, BookMarked, Sparkles } from "lucide-react";
import { DUROOD } from "@/data/durood";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicDurood() {
  const { slug = "" } = useParams();
  const idx = DUROOD.findIndex((d) => d.slug === slug);
  const d = idx >= 0 ? DUROOD[idx] : null;
  const prev = idx > 0 ? DUROOD[idx - 1] : null;
  const next = idx >= 0 && idx < DUROOD.length - 1 ? DUROOD[idx + 1] : null;

  if (!d) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO type="article" title="Durood not found — Heartify" description="This form of ṣalawāt was not found." path={`/durood/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={Sparkles}
            title="Durood not found"
            description="This form of ṣalawāt was not found. Return home to explore more ways to send blessings on the Prophet ﷺ."
            actionLabel="Return home"
            actionHref="/"
          />
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/durood/${d.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `durood:${d.slug}`,
      title: `${d.title} · Heartify`,
      text: `🌹 ${d.title} — ${d.meaning}`,
      url,
    });
    await track("durood.shared", { slug: d.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${d.title} — Ṣalawāt on the Prophet ﷺ · Heartify`}
        description={`${d.translit} — ${d.meaning.slice(0, 140)}`}
        path={`/durood/${d.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-5 text-center">
            <div className="inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-muted-foreground">
              <Heart className="h-4 w-4 text-primary" /> Ṣalawāt · {idx + 1} of {DUROOD.length}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-primary/10 text-primary text-micro font-medium">
              {d.category}
            </div>
            <h1 className="text-title md:text-title font-semibold">{d.title}</h1>
            <p
              dir="rtl"
              lang="ar"
              className="text-title md:text-title leading-loose text-primary text-right"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {d.arabic}
            </p>
            <p className="text-sm md:text-base italic text-muted-foreground">{d.translit}</p>
            <p className="text-base md:text-heading leading-relaxed border-l-2 border-primary/40 pl-4 text-left max-w-prose mx-auto">
              {d.meaning}
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6 border-primary/20">
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Virtue
            </div>
            <p className="text-sm md:text-base leading-relaxed">{d.virtue}</p>
            <p className="text-micro text-muted-foreground inline-flex items-center gap-1">
              <BookMarked className="h-3.5 w-3.5" /> {d.reference}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/adhkar">Open Adhkār</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/durood/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.title : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/durood/${next.slug}` : "#"}>
              {next ? next.title : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
