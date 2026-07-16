import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Sun, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { SALAWAT } from "@/data/salawat";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicSalah() {
  const { slug = SALAWAT[0].slug } = useParams();
  const idx = Math.max(0, SALAWAT.findIndex((s) => s.slug === slug));
  const s = SALAWAT[idx] ?? SALAWAT[0];
  const prev = idx > 0 ? SALAWAT[idx - 1] : null;
  const next = idx < SALAWAT.length - 1 ? SALAWAT[idx + 1] : null;
  const url = `${window.location.origin}/salah/${s.slug}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `salah:${s.slug}`,
      title: `${s.translit} (${s.en}) · Heartify`,
      text: `${s.ar} — ${s.fard} rakʿahs farḍ. ${s.virtue}`,
      url,
    });
    await track("salah.shared", { slug: s.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${s.translit} (${s.en}) — The ${s.fard}-rakʿah Prayer · Heartify`}
        description={`${s.translit}: ${s.when}. ${s.virtue}`}
        path={`/salah/${s.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-muted-foreground">
                <Sun className="h-4 w-4 text-primary" />
                Prayer {idx + 1} of {SALAWAT.length} · Ṣalāt al-Mafrūḍah
              </div>
              <p
                dir="rtl"
                lang="ar"
                className="mt-4 text-display md:text-display leading-loose text-primary"
                style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
              >
                {s.ar}
              </p>
              <h1 className="mt-2 text-title md:text-display font-semibold">
                {s.translit}{" "}
                <span className="text-muted-foreground text-title md:text-title">
                  ({s.en})
                </span>
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-card border border-border/60 bg-background/40 p-3">
                <p className="text-muted-foreground text-micro uppercase tracking-wider mb-1">Farḍ</p>
                <p className="text-title font-semibold">{s.fard}<span className="text-sm text-muted-foreground ml-1">rakʿahs</span></p>
              </div>
              <div className="rounded-card border border-border/60 bg-background/40 p-3 md:col-span-2">
                <p className="text-muted-foreground text-micro uppercase tracking-wider mb-1 inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Time
                </p>
                <p>{s.when}</p>
              </div>
            </div>

            <div className="rounded-card border border-border/60 bg-background/40 p-3 text-sm">
              <p className="text-muted-foreground text-micro uppercase tracking-wider mb-1">Regular Sunnah</p>
              <p>{s.sunnah}</p>
            </div>

            <p className="text-center text-base md:text-heading text-muted-foreground italic max-w-prose mx-auto">
              {s.virtue}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/salah-guide">Full Ṣalāh Guide</Link>
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
            <Link to={prev ? `/salah/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/salah/${next.slug}` : "#"}>
              {next ? next.translit : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
