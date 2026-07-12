import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { JUZ } from "@/data/juz";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicJuz() {
  const { n = "1" } = useParams();
  const num = Math.max(1, Math.min(30, parseInt(n, 10) || 1));
  const j = JUZ.find((x) => x.n === num) ?? JUZ[0];
  const prev = num > 1 ? num - 1 : null;
  const next = num < 30 ? num + 1 : null;
  const url = `${window.location.origin}/juz/${num}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `juz:${num}`,
      title: `Juzʾ ${num} — ${j.translit} · Heartify`,
      text: `📖 Juzʾ ${num} of 30 — ${j.translit}\n${j.start} → ${j.end}`,
      url,
    });
    await track("juz.shared", { n: num });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`Juzʾ ${num} — ${j.translit} (${j.name_ar}) · Heartify`}
        description={`Juzʾ ${num} of 30 covering ${j.start} → ${j.end}. ${j.summary}`}
        path={`/juz/${num}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              Juzʾ {num} of 30 · Ajzāʾ al-Qurʾān
            </div>
            <p dir="rtl" lang="ar" className="text-5xl md:text-6xl leading-loose text-primary"
               style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {j.name_ar}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">{j.translit}</h1>
            <div className="text-sm text-muted-foreground">
              <div>{j.start}</div>
              <div className="opacity-60">↓</div>
              <div>{j.end}</div>
            </div>
            <p className="text-base md:text-lg text-muted-foreground max-w-prose mx-auto">
              {j.summary}
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/surah/${j.startRef.surah}`}>Open opening sūrah</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/ayah/${j.startRef.surah}/${j.startRef.ayah}`}>First āyah</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/quran">Read the Qurʾān</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/juz/${prev}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Juzʾ {prev ?? ""}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/juz/${next}` : "#"}>
              Juzʾ {next ?? ""} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
