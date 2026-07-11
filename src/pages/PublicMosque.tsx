import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, MapPin, ChevronLeft, ChevronRight, BookMarked, Building2, MapPinOff } from "lucide-react";
import { SACRED_MOSQUES } from "@/data/sacredMosques";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicMosque() {
  const { slug = "" } = useParams();
  const idx = SACRED_MOSQUES.findIndex((m) => m.slug === slug);
  const m = idx >= 0 ? SACRED_MOSQUES[idx] : null;
  const prev = idx > 0 ? SACRED_MOSQUES[idx - 1] : null;
  const next = idx >= 0 && idx < SACRED_MOSQUES.length - 1 ? SACRED_MOSQUES[idx + 1] : null;

  if (!m) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Mosque not found — Heartify" description="This sacred mosque page could not be found." path={`/mosque/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={MapPinOff}
            title="Mosque not found"
            description="This sacred mosque page could not be found. Return home to explore more sacred places."
            actionLabel="Return home"
            actionHref="/"
          />
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/mosque/${m.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `mosque:${m.slug}`,
      title: `${m.translit} — ${m.en} · Heartify`,
      text: `🕌 ${m.translit} — ${m.city}, ${m.country}. ${m.summary.slice(0, 120)}`,
      url,
    });
    await track("mosque.shared", { slug: m.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${m.translit} — ${m.en} · Sacred Mosques · Heartify`}
        description={`${m.translit} (${m.ar}) in ${m.city}, ${m.country}. ${m.summary.slice(0, 140)}`}
        path={`/mosque/${m.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-5 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              Sacred Mosque · {idx + 1} of {SACRED_MOSQUES.length}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-4xl md:text-5xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {m.ar}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold">{m.translit}</h1>
            <p className="text-base md:text-lg text-primary/90 font-medium">{m.en}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] uppercase inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {m.city}, {m.country}
              </Badge>
              {m.founded && (
                <Badge variant="outline" className="text-[10px] uppercase">Founded: {m.founded}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60">
          <CardContent className="pt-5 pb-5 space-y-4">
            <p className="text-sm md:text-base leading-relaxed border-l-2 border-primary/40 pl-4">
              {m.summary}
            </p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <BookMarked className="h-3.5 w-3.5" /> Sacred sites of the ummah
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/prayer-times">Prayer Times</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/mosque/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/mosque/${next.slug}` : "#"}>
              {next ? next.translit : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
