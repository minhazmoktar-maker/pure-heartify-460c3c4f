import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Hourglass, ChevronLeft, ChevronRight, BookMarked, AlertTriangle } from "lucide-react";
import { SIGNS_OF_HOUR } from "@/data/signsOfHour";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const STATUS_STYLES: Record<string, string> = {
  fulfilled: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  unfolding: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  awaited:   "border-rose-500/40 bg-rose-500/10 text-rose-500",
};

const STATUS_LABEL: Record<string, string> = {
  fulfilled: "Already fulfilled",
  unfolding: "Unfolding today",
  awaited:   "Yet to come",
};

export default function PublicSignOfHour() {
  const { slug = "" } = useParams();
  const idx = SIGNS_OF_HOUR.findIndex((s) => s.slug === slug);
  const s = idx >= 0 ? SIGNS_OF_HOUR[idx] : null;
  const prev = idx > 0 ? SIGNS_OF_HOUR[idx - 1] : null;
  const next = idx >= 0 && idx < SIGNS_OF_HOUR.length - 1 ? SIGNS_OF_HOUR[idx + 1] : null;

  if (!s) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Sign not found — Heartify" description="This sign of the Hour could not be found." path={`/sign-of-hour/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <Card><CardContent className="py-12 text-center space-y-3">
            <h1 className="text-xl font-semibold">Sign not found</h1>
            <Button asChild variant="outline"><Link to="/">Home</Link></Button>
          </CardContent></Card>
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/sign-of-hour/${s.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `sign-of-hour:${s.slug}`,
      title: `${s.translit} — Sign of the Hour · Heartify`,
      text: `⏳ ${s.translit} — ${s.title}. ${s.summary.slice(0, 120)}`,
      url,
    });
    await track("sign_of_hour.shared", { slug: s.slug });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${s.translit} — ${s.title} · Signs of the Hour · Heartify`}
        description={`${s.translit} (${s.arabic}) — ${s.summary.slice(0, 140)}`}
        path={`/sign-of-hour/${s.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-5 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Hourglass className="h-4 w-4 text-primary" />
              Ashrāṭ as-Sāʿah · {idx + 1} of {SIGNS_OF_HOUR.length}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-4xl md:text-5xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {s.arabic}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold">{s.translit}</h1>
            <p className="text-base md:text-lg text-primary/90 font-medium">{s.title}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] uppercase">
                {s.category === "major" ? "Major sign" : "Minor sign"}
              </Badge>
              <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_STYLES[s.status]}`}>
                {STATUS_LABEL[s.status]}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60">
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="flex items-start gap-2 text-sm md:text-base leading-relaxed border-l-2 border-primary/40 pl-4">
              <AlertTriangle className="h-4 w-4 mt-1 text-primary shrink-0" />
              <p>{s.summary}</p>
            </div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <BookMarked className="h-3.5 w-3.5" /> {s.reference}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/adhkar">Fortify with Adhkār</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/sign-of-hour/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/sign-of-hour/${next.slug}` : "#"}>
              {next ? next.translit : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
