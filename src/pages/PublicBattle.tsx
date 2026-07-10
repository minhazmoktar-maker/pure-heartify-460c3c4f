import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Swords, MapPin, Calendar, Users, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { BATTLES } from "@/data/battles";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const OUTCOME_STYLE: Record<string, string> = {
  "Decisive Victory": "bg-primary/15 text-primary border-primary/30",
  "Strategic Victory": "bg-primary/10 text-primary border-primary/20",
  "Truce": "bg-muted text-foreground border-border",
  "Setback": "bg-destructive/10 text-destructive border-destructive/20",
  "Withdrawal": "bg-muted text-muted-foreground border-border",
};

export default function PublicBattle() {
  const { slug = "" } = useParams();
  const idx = BATTLES.findIndex((b) => b.slug === slug);
  const b = idx >= 0 ? BATTLES[idx] : null;
  const prev = idx > 0 ? BATTLES[idx - 1] : null;
  const next = idx >= 0 && idx < BATTLES.length - 1 ? BATTLES[idx + 1] : null;

  if (!b) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Battle not found — Heartify" description="This battle could not be found." path={`/battle/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <Card><CardContent className="py-12 text-center space-y-3">
            <h1 className="text-xl font-semibold">Battle not found</h1>
            <Button asChild variant="outline"><Link to="/battles">Open the battles archive</Link></Button>
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
      title: `${b.translit} · Heartify`,
      text: `⚔️ ${b.translit} (${b.hijri}) — ${b.outcome}\n${b.summary}`,
      url,
    });
    await track("battle.shared", { slug: b.slug });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${b.translit} — ${b.hijri} · Heartify`}
        description={`${b.translit} at ${b.place} (${b.hijri} / ${b.ce}): ${b.summary}`}
        path={`/battle/${b.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Swords className="h-4 w-4 text-primary" /> Ghazawāt · Battle {idx + 1} of {BATTLES.length}
              </span>
            </div>
            <p dir="rtl" lang="ar" className="text-4xl md:text-5xl leading-loose text-primary text-right"
               style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {b.name_ar}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">{b.translit}</h1>
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${OUTCOME_STYLE[b.outcome] ?? ""}`}>
              <Shield className="h-3.5 w-3.5" /> {b.outcome}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {b.hijri} · {b.ce}</div>
              <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {b.place}</div>
              <div className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Muslims: {b.muslim_force}</div>
              <div className="inline-flex items-center gap-2"><Swords className="h-4 w-4 text-primary" /> Opponent: {b.opponent}</div>
            </div>
            <p className="text-base md:text-lg leading-relaxed border-l-2 border-primary/40 pl-4">
              {b.summary}
            </p>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Lesson</div>
              <p className="text-sm md:text-base italic">{b.lesson}</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/battles">All battles</Link></Button>
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
