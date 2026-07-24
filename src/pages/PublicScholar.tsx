import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, GraduationCap, MapPin, Calendar, BookOpen, ChevronLeft, ChevronRight, UserX, PlayCircle } from "lucide-react";
import { SCHOLARS } from "@/data/scholars";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";


export default function PublicScholar() {
  const { slug = "" } = useParams();
  const idx = SCHOLARS.findIndex((s) => s.slug === slug);
  const s = idx >= 0 ? SCHOLARS[idx] : null;
  const prev = idx > 0 ? SCHOLARS[idx - 1] : null;
  const next = idx >= 0 && idx < SCHOLARS.length - 1 ? SCHOLARS[idx + 1] : null;

  if (!s) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO type="article" title="Scholar not found — Heartify" description="This scholar could not be found." path={`/scholar/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={UserX}
            title="Scholar not found"
            description="This scholar could not be found. Return home to explore the biographies of the pious predecessors."
            actionLabel="Return home"
            actionHref="/"
          />
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/scholar/${s.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `scholar:${s.slug}`,
      title: `${s.translit} · Heartify`,
      text: `📚 ${s.translit} (${s.lifespan}) — ${s.summary}`,
      url,
    });
    await track("scholar.shared", { slug: s.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${s.translit} (${s.name_ar}) — ${s.field} · Heartify`}
        description={`${s.translit} (${s.lifespan}) — ${s.summary}`}
        path={`/scholar/${s.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-muted-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              Scholar {idx + 1} of {SCHOLARS.length}
            </div>
            <p dir="rtl" lang="ar" className="text-display md:text-display leading-loose text-primary"
               style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {s.name_ar}
            </p>
            <div>
              <h1 className="text-title md:text-display font-semibold">{s.translit}</h1>
              {s.kunya && <p className="mt-1 text-sm text-muted-foreground italic">{s.kunya}</p>}
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {s.lifespan}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {s.region}</span>
            </div>
            <div className="inline-block rounded-pill border border-primary/30 bg-primary/5 px-3 py-1 text-micro font-medium">
              {s.field}
            </div>
            <p className="text-base md:text-heading text-muted-foreground max-w-prose mx-auto">
              {s.summary}
            </p>
            {s.works && (
              <p className="inline-flex items-center gap-2 text-sm border-t border-border pt-4 mx-auto">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Notable works:</span>
                <span className="font-medium">{s.works}</span>
              </p>
            )}
            <p className="text-micro text-muted-foreground">raḥimahu-Llāh</p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" onClick={() => track("scholar.lectures_opened", { slug: s.slug, source: "internal_search" })}>
            <Link to={`/search?q=${encodeURIComponent(s.translit)}`}>
              <PlayCircle className="h-4 w-4 mr-2" /> Watch lectures
            </Link>
          </Button>
          <Button asChild variant="outline"><Link to="/scholars">All scholars</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/scholar/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/scholar/${next.slug}` : "#"}>
              {next ? next.translit : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
