import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Star, ChevronLeft, ChevronRight, BookMarked, UserX } from "lucide-react";
import { PROPHET_NAMES } from "@/data/prophetNames";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicProphetName() {
  const { slug = "" } = useParams();
  const idx = PROPHET_NAMES.findIndex((n) => n.slug === slug);
  const n = idx >= 0 ? PROPHET_NAMES[idx] : null;
  const prev = idx > 0 ? PROPHET_NAMES[idx - 1] : null;
  const next = idx >= 0 && idx < PROPHET_NAMES.length - 1 ? PROPHET_NAMES[idx + 1] : null;

  if (!n) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO type="article" title="Name not found — Heartify" description="This name of the Prophet ﷺ was not found." path={`/prophet-name/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={UserX}
            title="Name not found"
            description="This blessed name of the Prophet ﷺ was not found. Return home to explore more of his ﷺ noble attributes."
            actionLabel="Return home"
            actionHref="/"
          />
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/prophet-name/${n.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `prophet-name:${n.slug}`,
      title: `${n.translit} — ${n.meaning} · Heartify`,
      text: `🌙 ${n.translit} (${n.meaning}) — one of the blessed names of the Prophet ﷺ.`,
      url,
    });
    await track("prophet_name.shared", { slug: n.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${n.translit} ﷺ — ${n.meaning} · Names of the Prophet · Heartify`}
        description={`${n.translit} (${n.arabic}) — ${n.meaning}. ${n.explanation.slice(0, 120)}`}
        path={`/prophet-name/${n.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-5 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Star className="h-4 w-4 text-primary" /> Name of the Prophet ﷺ · {idx + 1} of {PROPHET_NAMES.length}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-5xl md:text-6xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {n.arabic}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold">{n.translit} ﷺ</h1>
            <p className="text-lg md:text-xl text-primary/90 font-medium">{n.meaning}</p>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60">
          <CardContent className="pt-5 pb-5 space-y-3">
            <p className="text-sm md:text-base leading-relaxed border-l-2 border-primary/40 pl-4">
              {n.explanation}
            </p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <BookMarked className="h-3.5 w-3.5" /> {n.reference}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/seerah">Explore Seerah</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/prophet-name/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/prophet-name/${next.slug}` : "#"}>
              {next ? next.translit : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
