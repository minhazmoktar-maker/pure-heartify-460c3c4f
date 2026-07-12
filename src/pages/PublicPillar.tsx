import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { PILLARS } from "@/data/foundations";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicPillar() {
  const { n = "1" } = useParams();
  const num = Math.max(1, Math.min(PILLARS.length, parseInt(n, 10) || 1));
  const p = PILLARS.find((x) => x.n === num) ?? PILLARS[0];
  const prev = num > 1 ? num - 1 : null;
  const next = num < PILLARS.length ? num + 1 : null;
  const url = `${window.location.origin}/pillar/${num}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `pillar:${num}`,
      title: `Pillar ${num} — ${p.translit} (${p.en}) · Heartify`,
      text: `${p.ar} — ${p.translit}: ${p.summary}`,
      url,
    });
    await track("pillar.shared", { n: num });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`Pillar ${num} of Islam — ${p.translit} (${p.en}) · Heartify`}
        description={`${p.translit}: ${p.summary}`}
        path={`/pillar/${num}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              Pillar {num} of 5 · Arkān al-Islām
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-6xl md:text-7xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {p.ar}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              {p.translit}{" "}
              <span className="text-muted-foreground text-2xl md:text-3xl">
                ({p.en})
              </span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-prose mx-auto">
              {p.summary}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/pillars">All 5 Pillars</Link>
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
            <Link to={prev ? `/pillar/${prev}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/pillar/${next}` : "#"}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
