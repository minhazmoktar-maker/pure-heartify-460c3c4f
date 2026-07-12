import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Sparkles, ChevronLeft, ChevronRight, Tag, BookMarked, BookOpen } from "lucide-react";
import { SUNNAH_ACTS } from "@/data/sunnahActs";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const CAT_STYLE: Record<string, string> = {
  "Wuḍūʾ": "bg-primary/15 text-primary border-primary/30",
  "Ṣalāh": "bg-primary/15 text-primary border-primary/30",
  "Food": "bg-primary/10 text-primary border-primary/20",
  "Sleep": "bg-muted text-foreground border-border",
  "Speech": "bg-primary/10 text-primary border-primary/20",
  "Home": "bg-muted text-foreground border-border",
  "Body": "bg-primary/10 text-primary border-primary/20",
  "Travel": "bg-muted text-foreground border-border",
  "Masjid": "bg-primary/15 text-primary border-primary/30",
};

export default function PublicSunnahAct() {
  const { slug = "" } = useParams();
  const idx = SUNNAH_ACTS.findIndex((s) => s.slug === slug);
  const s = idx >= 0 ? SUNNAH_ACTS[idx] : null;
  const prev = idx > 0 ? SUNNAH_ACTS[idx - 1] : null;
  const next = idx >= 0 && idx < SUNNAH_ACTS.length - 1 ? SUNNAH_ACTS[idx + 1] : null;

  if (!s) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO type="article" title="Sunnah not found — Heartify" description="This Sunnah act could not be found." path={`/sunnah/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={BookOpen}
            title="Sunnah not found"
            description="This Sunnah act could not be found. Open the Adhkār library for authentic prophetic practices."
            actionLabel="Open Adhkār"
            actionHref="/adhkar"
          />
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/sunnah/${s.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `sunnah:${s.slug}`,
      title: `${s.title} — Sunnah of the Prophet ﷺ · Heartify`,
      text: `🌿 ${s.title}: ${s.reward}`,
      url,
    });
    await track("sunnah.shared", { slug: s.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${s.title} — Revive a Sunnah of the Prophet ﷺ · Heartify`}
        description={`${s.reward} How: ${s.how} (${s.ref})`}
        path={`/sunnah/${s.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Sunnah · {idx + 1} of {SUNNAH_ACTS.length}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium normal-case tracking-normal ${CAT_STYLE[s.category] ?? ""}`}>
                <Tag className="h-3 w-3" /> {s.category}
              </span>
            </div>
            <p dir="rtl" lang="ar" className="text-4xl md:text-5xl leading-loose text-primary text-center"
               style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {s.ar}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-center">{s.title}</h1>
            <p className="text-base md:text-lg leading-relaxed border-l-2 border-primary/40 pl-4">
              {s.reward}
            </p>
            <div className="rounded-lg bg-muted/50 border p-4 space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">How to do it</p>
              <p className="text-sm md:text-base">{s.how}</p>
            </div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <BookMarked className="h-3.5 w-3.5" /> {s.ref}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/adhkar">Open Adhkār</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/sunnah/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.title : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/sunnah/${next.slug}` : "#"}>
              {next ? next.title : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
