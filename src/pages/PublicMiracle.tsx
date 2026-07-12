import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Sparkles, MapPin, BookOpen, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { MIRACLES } from "@/data/miracles";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const CATEGORY_STYLE: Record<string, string> = {
  "Qurʾānic": "bg-primary/15 text-primary border-primary/30",
  "Cosmic": "bg-primary/10 text-primary border-primary/20",
  "Physical": "bg-muted text-foreground border-border",
  "Provision": "bg-primary/10 text-primary border-primary/20",
  "Prophecy": "bg-muted text-foreground border-border",
  "Healing": "bg-primary/10 text-primary border-primary/20",
};

export default function PublicMiracle() {
  const { slug = "" } = useParams();
  const idx = MIRACLES.findIndex((m) => m.slug === slug);
  const m = idx >= 0 ? MIRACLES[idx] : null;
  const prev = idx > 0 ? MIRACLES[idx - 1] : null;
  const next = idx >= 0 && idx < MIRACLES.length - 1 ? MIRACLES[idx + 1] : null;

  if (!m) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO type="article" title="Miracle not found — Heartify" description="This miracle could not be found." path={`/miracle/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={Sparkles}
            title="Miracle not found"
            description="This miracle could not be found. Open the Seerah timeline to explore the signs of Prophethood."
            actionLabel="Open the Seerah timeline"
            actionHref="/seerah"
          />
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/miracle/${m.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `miracle:${m.slug}`,
      title: `${m.translit} · Heartify`,
      text: `✨ ${m.translit}\n${m.summary}`,
      url,
    });
    await track("miracle.shared", { slug: m.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${m.translit} — Muʿjizāt · Heartify`}
        description={`${m.translit} — a miracle of the Prophet Muḥammad ﷺ at ${m.place}: ${m.summary}`}
        path={`/miracle/${m.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Muʿjizāt · Miracle {idx + 1} of {MIRACLES.length}
              </span>
            </div>
            <p dir="rtl" lang="ar" className="text-4xl md:text-5xl leading-loose text-primary text-right"
               style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {m.name_ar}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold leading-tight">{m.translit}</h1>
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${CATEGORY_STYLE[m.category] ?? ""}`}>
              <Tag className="h-3.5 w-3.5" /> {m.category}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {m.place}</div>
              <div className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {m.source}</div>
            </div>
            <p className="text-base md:text-lg leading-relaxed border-l-2 border-primary/40 pl-4">
              {m.summary}
            </p>
            <p className="text-xs text-muted-foreground italic">
              ṣallā-Llāhu ʿalayhi wa-sallam — may Allāh send peace and blessings upon him.
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/seerah">Full Seerah</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/miracle/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.translit.split(" — ")[0] : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/miracle/${next.slug}` : "#"}>
              {next ? next.translit.split(" — ")[0] : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
