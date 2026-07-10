import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Feather, ChevronLeft, ChevronRight } from "lucide-react";
import { KALIMAHS } from "@/data/kalimahs";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicKalimah() {
  const { n = "1" } = useParams();
  const num = Math.max(1, Math.min(KALIMAHS.length, parseInt(n, 10) || 1));
  const k = KALIMAHS.find((x) => x.n === num) ?? KALIMAHS[0];
  const prev = num > 1 ? num - 1 : null;
  const next = num < KALIMAHS.length ? num + 1 : null;
  const url = `${window.location.origin}/kalimah/${num}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `kalimah:${num}`,
      title: `${k.translit} — ${k.name_en} · Heartify`,
      text: `${k.arabic}\n\n${k.translation}`,
      url,
    });
    await track("kalimah.shared", { n: num });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Kalimah ${num} — ${k.translit} (${k.name_en}) · Heartify`}
        description={`${k.translit}: ${k.translation}`}
        path={`/kalimah/${num}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
                <Feather className="h-4 w-4 text-primary" />
                Kalimah {num} of {KALIMAHS.length}
              </div>
              <h1 className="mt-3 text-2xl md:text-3xl font-semibold">
                {k.translit}
              </h1>
              <p className="text-sm text-muted-foreground">{k.name_en}</p>
            </div>

            <p
              dir="rtl"
              lang="ar"
              className="text-3xl md:text-4xl leading-loose text-primary text-center"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {k.arabic}
            </p>

            <p className="italic text-center text-muted-foreground">
              {k.transliteration}
            </p>
            <p className="text-center text-base md:text-lg">
              {k.translation}
            </p>
            {k.note && (
              <p className="text-center text-xs text-muted-foreground max-w-prose mx-auto">
                {k.note}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/kalimahs">Learn all 6 Kalimahs</Link>
          </Button>
          <Button variant="outline" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button asChild variant="ghost">
            <Link to="/signup">Join Heartify</Link>
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/kalimah/${prev}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/kalimah/${next}` : "#"}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
