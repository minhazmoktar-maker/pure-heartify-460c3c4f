import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { Share2, Swords, ChevronLeft, ChevronRight, BookMarked, Users, MapPin, Calendar, SearchX } from "lucide-react";
import { BATTLES } from "@/data/battles";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const OUTCOME_TONE: Record<string, string> = {
  "Decisive Victory":  "heartify-chip--primary",
  "Strategic Victory": "heartify-chip--primary",
  "Truce":             "heartify-chip--muted",
  "Setback":           "heartify-chip--warning",
  "Withdrawal":        "heartify-chip--warning",
};

export default function PublicBattle() {
  const { slug = "" } = useParams();
  const idx = BATTLES.findIndex((b) => b.slug === slug);
  const b = idx >= 0 ? BATTLES[idx] : null;
  const prev = idx > 0 ? BATTLES[idx - 1] : null;
  const next = idx >= 0 && idx < BATTLES.length - 1 ? BATTLES[idx + 1] : null;

  if (!b) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Battle not found — Heartify" description="This battle page could not be found." path={`/battle/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <Card><CardContent className="py-12 text-center space-y-3">
            <h1 className="text-xl font-semibold">Battle not found</h1>
            <Button asChild variant="outline"><Link to="/">Home</Link></Button>
          </CardContent></Card>
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/battle/${b.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `battle:${b.slug}`,
      title: `${b.translit} — Heartify`,
      text: `⚔️ ${b.translit} (${b.hijri}) — ${b.summary.slice(0, 120)}`,
      url,
    });
    await track("battle.shared", { slug: b.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${b.translit} — Ghazawāt of the Prophet ﷺ · Heartify`}
        description={`${b.translit} (${b.name_ar}) — ${b.hijri} / ${b.ce}. ${b.summary.slice(0, 140)}`}
        path={`/battle/${b.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-5 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Swords className="h-4 w-4 text-primary" />
              Ghazwah · {idx + 1} of {BATTLES.length}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-4xl md:text-5xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {b.name_ar}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold">{b.translit}</h1>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] uppercase inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {b.hijri} · {b.ce}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {b.place}
              </Badge>
              <Badge variant="outline" className={`text-[10px] uppercase ${OUTCOME_STYLES[b.outcome] || ""}`}>
                {b.outcome}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60">
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border/60 p-3">
                <div className="text-[10px] uppercase text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> Muslim force
                </div>
                <div className="mt-1 font-medium">{b.muslim_force}</div>
              </div>
              <div className="rounded-md border border-border/60 p-3">
                <div className="text-[10px] uppercase text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> Opponent
                </div>
                <div className="mt-1 font-medium">{b.opponent}</div>
              </div>
            </div>
            <p className="text-sm md:text-base leading-relaxed border-l-2 border-primary/40 pl-4">
              {b.summary}
            </p>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              <div className="text-[10px] uppercase text-primary/80 mb-1 inline-flex items-center gap-1">
                <BookMarked className="h-3 w-3" /> Lesson
              </div>
              {b.lesson}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/seerah">Study the Sīrah</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/battle/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/battle/${next.slug}` : "#"}>
              {next ? next.translit : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
