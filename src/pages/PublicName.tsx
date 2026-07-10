import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { ASMA_UL_HUSNA } from "@/data/asmaUlHusna";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicName() {
  const { index = "1" } = useParams();
  const n = Math.max(1, Math.min(99, parseInt(index, 10) || 1));
  const name = ASMA_UL_HUSNA.find((x) => x.n === n) ?? ASMA_UL_HUSNA[0];
  const prev = n > 1 ? n - 1 : null;
  const next = n < 99 ? n + 1 : null;
  const url = `${window.location.origin}/name/${n}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `name:${n}`,
      title: `${name.translit} — ${name.meaning} · Heartify`,
      text: `✨ ${name.ar} — ${name.translit}: ${name.meaning}`,
      url,
    });
    await track("name.shared", { n });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${name.translit} (${name.ar}) — ${name.meaning} · Heartify`}
        description={`Name ${n} of 99: ${name.translit} — ${name.meaning}. Learn all Beautiful Names of Allah on Heartify.`}
        path={`/name/${n}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Name {n} of 99 · Asmāʾ al-Ḥusnā
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-6xl md:text-7xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {name.ar}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">{name.translit}</h1>
            <p className="text-lg md:text-xl text-muted-foreground">{name.meaning}</p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/names">Explore all 99 Names</Link>
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
            <Link to={prev ? `/name/${prev}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/name/${next}` : "#"}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
