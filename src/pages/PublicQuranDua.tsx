import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, HandHeart, BookOpen, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { QURAN_DUAS } from "@/data/quranDuas";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const THEME_STYLE: Record<string, string> = {
  "Forgiveness": "bg-primary/15 text-primary border-primary/30",
  "Guidance": "bg-primary/10 text-primary border-primary/20",
  "Family": "bg-primary/10 text-primary border-primary/20",
  "Steadfastness": "bg-muted text-foreground border-border",
  "Protection": "bg-primary/15 text-primary border-primary/30",
  "Provision": "bg-primary/10 text-primary border-primary/20",
  "Knowledge": "bg-muted text-foreground border-border",
  "Dunyā & Ākhirah": "bg-primary/15 text-primary border-primary/30",
};

export default function PublicQuranDua() {
  const { slug = "" } = useParams();
  const idx = QURAN_DUAS.findIndex((d) => d.slug === slug);
  const d = idx >= 0 ? QURAN_DUAS[idx] : null;
  const prev = idx > 0 ? QURAN_DUAS[idx - 1] : null;
  const next = idx >= 0 && idx < QURAN_DUAS.length - 1 ? QURAN_DUAS[idx + 1] : null;

  if (!d) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Duʿāʾ not found — Heartify" description="This duʿā could not be found." path={`/quran-dua/${slug}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <Card><CardContent className="py-12 text-center space-y-3">
            <h1 className="text-xl font-semibold">Duʿāʾ not found</h1>
            <Button asChild variant="outline"><Link to="/adhkar">Open Adhkār</Link></Button>
          </CardContent></Card>
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/quran-dua/${d.slug}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `quran-dua:${d.slug}`,
      title: `${d.translit} · Heartify`,
      text: `🤲 ${d.translation}\nQurʾān ${d.ref}`,
      url,
    });
    await track("quran_dua.shared", { slug: d.slug });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Duʿāʾ from the Qurʾān — ${d.translit} (Qurʾān ${d.ref}) · Heartify`}
        description={`${d.translation} — Qurʾānic duʿā from ${d.ref}. ${d.context}`}
        path={`/quran-dua/${d.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <HandHeart className="h-4 w-4 text-primary" /> Duʿāʾ from the Qurʾān · {idx + 1} of {QURAN_DUAS.length}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Qurʾān {d.ref}
              </span>
            </div>
            <p dir="rtl" lang="ar" className="text-3xl md:text-4xl leading-loose text-primary text-right"
               style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {d.arabic}
            </p>
            <p className="text-sm md:text-base italic text-muted-foreground">{d.translit}</p>
            <p className="text-base md:text-lg leading-relaxed border-l-2 border-primary/40 pl-4">
              {d.translation}
            </p>
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${THEME_STYLE[d.theme] ?? ""}`}>
              <Tag className="h-3.5 w-3.5" /> {d.theme}
            </div>
            <p className="text-xs text-muted-foreground">{d.context}</p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/adhkar">Open Adhkār</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/quran-dua/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.ref : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/quran-dua/${next.slug}` : "#"}>
              {next ? next.ref : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
