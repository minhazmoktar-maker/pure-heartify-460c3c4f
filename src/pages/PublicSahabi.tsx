import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { SAHABA } from "@/data/sahaba";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicSahabi() {
  const { slug = SAHABA[0].slug } = useParams();
  const idx = Math.max(0, SAHABA.findIndex((s) => s.slug === slug));
  const s = SAHABA[idx] ?? SAHABA[0];
  const prev = idx > 0 ? SAHABA[idx - 1] : null;
  const next = idx < SAHABA.length - 1 ? SAHABA[idx + 1] : null;
  const url = `${window.location.origin}/sahabi/${s.slug}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `sahabi:${s.slug}`,
      title: `${s.translit} · Heartify`,
      text: `${s.ar} — ${s.translit}${s.title ? ` (${s.title})` : ""}: ${s.summary}`,
      url,
    });
    await track("sahabi.shared", { slug: s.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${s.translit} (${s.en}) — Companion of the Prophet ﷺ · Heartify`}
        description={`${s.translit}${s.title ? ` — ${s.title}` : ""}: ${s.summary}`}
        path={`/sahabi/${s.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Companion {idx + 1} of {SAHABA.length} · Ṣaḥābah
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-display md:text-display leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {s.ar}
            </p>
            <h1 className="text-title md:text-display font-semibold">
              {s.translit}{" "}
              <span className="text-muted-foreground text-title md:text-title">
                ({s.en})
              </span>
            </h1>
            {s.title && (
              <p className="text-sm md:text-base text-primary/80 font-medium">
                {s.title}
              </p>
            )}
            <p className="text-base md:text-heading text-muted-foreground max-w-prose mx-auto">
              {s.summary}
            </p>
            <p className="text-micro text-muted-foreground">May Allah be pleased with them</p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/sahaba">Explore all Companions</Link>
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
            <Link to={prev ? `/sahabi/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/sahabi/${next.slug}` : "#"}>
              {next ? next.translit : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
