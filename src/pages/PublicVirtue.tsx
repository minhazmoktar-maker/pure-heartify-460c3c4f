import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Heart, ChevronLeft, ChevronRight, BookMarked, Quote } from "lucide-react";
import { VIRTUES } from "@/data/virtues";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicVirtue() {
  const { slug = "" } = useParams();
  const idx = VIRTUES.findIndex((v) => v.slug === slug);
  const v = idx >= 0 ? VIRTUES[idx] : null;
  const prev = idx > 0 ? VIRTUES[idx - 1] : null;
  const next = idx >= 0 && idx < VIRTUES.length - 1 ? VIRTUES[idx + 1] : null;

  if (!v) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Virtue not found — Heartify" description="This virtue page could not be found." path={`/virtue/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <Card><CardContent className="py-12 text-center space-y-3">
            <h1 className="text-xl font-semibold">Virtue not found</h1>
            <Button asChild variant="outline"><Link to="/">Home</Link></Button>
          </CardContent></Card>
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/virtue/${v.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `virtue:${v.slug}`,
      title: `${v.translit} — ${v.en} · Heartify`,
      text: `❤ ${v.translit} (${v.en}). ${v.summary.slice(0, 120)}`,
      url,
    });
    await track("virtue.shared", { slug: v.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${v.translit} — ${v.en} · Prophetic Virtues · Heartify`}
        description={`${v.translit} (${v.ar}) — ${v.summary.slice(0, 140)}`}
        path={`/virtue/${v.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-5 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Heart className="h-4 w-4 text-primary" />
              Akhlāq · {idx + 1} of {VIRTUES.length}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-5xl md:text-6xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {v.ar}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold">{v.translit}</h1>
            <p className="text-base md:text-lg text-primary/90 font-medium">{v.en}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] uppercase">Prophetic virtue</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60">
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="text-[10px] uppercase text-primary/80 mb-1 inline-flex items-center gap-1">
                <Quote className="h-3 w-3" /> From the Qurʾān
              </div>
              <p className="text-sm md:text-base leading-relaxed italic">"{v.ayah}"</p>
              <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                <BookMarked className="h-3 w-3" /> {v.ayahRef}
              </p>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <div className="text-[10px] uppercase text-muted-foreground mb-1 inline-flex items-center gap-1">
                <Quote className="h-3 w-3" /> From the Sunnah
              </div>
              <p className="text-sm md:text-base leading-relaxed italic">"{v.hadith}"</p>
              <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                <BookMarked className="h-3 w-3" /> {v.hadithRef}
              </p>
            </div>
            <p className="text-sm md:text-base leading-relaxed border-l-2 border-primary/40 pl-4">
              {v.summary}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/adhkar">Purify with Adhkār</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/virtue/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/virtue/${next.slug}` : "#"}>
              {next ? next.translit : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
