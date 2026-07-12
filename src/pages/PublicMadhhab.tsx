import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Scale, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { MADHAHIB, findMadhhab } from "@/data/madhahib";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicMadhhab() {
  const { slug } = useParams();
  const m = findMadhhab(slug) ?? MADHAHIB[0];
  const idx = MADHAHIB.findIndex((x) => x.slug === m.slug);
  const prev = idx > 0 ? MADHAHIB[idx - 1] : null;
  const next = idx < MADHAHIB.length - 1 ? MADHAHIB[idx + 1] : null;
  const url = `${window.location.origin}/madhhab/${m.slug}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `madhhab:${m.slug}`,
      title: `The ${m.name} School · Heartify`,
      text: `${m.name} madhhab — founded by ${m.founder} (${m.lifespan}).`,
      url,
    });
    await track("madhhab.shared", { slug: m.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${m.name} Madhhab — ${m.founder} · Heartify`}
        description={`The ${m.name} school of Sunni fiqh, founded by ${m.founder} (${m.lifespan}). ${m.summary}`}
        path={`/madhhab/${m.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Scale className="h-4 w-4 text-primary" />
              School {idx + 1} of 4 · Madhāhib
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-6xl md:text-7xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {m.arabic}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              The {m.name} School
            </h1>
            <div className="space-y-1">
              <p className="text-lg text-muted-foreground">
                {m.founder}
              </p>
              <p
                dir="rtl"
                lang="ar"
                className="text-xl text-primary/80"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {m.founderArabic}
              </p>
              <p className="text-sm text-muted-foreground">{m.lifespan}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" /> Origin: {m.origin}
              </Badge>
            </div>

            <p className="text-base text-muted-foreground max-w-prose mx-auto">
              {m.summary}
            </p>

            <div className="text-left space-y-3 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Predominant regions
                </p>
                <p className="text-sm">{m.regions}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Methodology (uṣūl)
                </p>
                <p className="text-sm">{m.method}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/library">Explore Islamic library</Link>
          </Button>
          <Button variant="outline" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button asChild variant="ghost">
            <Link to="/signup">Join Heartify</Link>
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/madhhab/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" />{" "}
              {prev ? prev.name : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/madhhab/${next.slug}` : "#"}>
              {next ? next.name : "Next"}{" "}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
