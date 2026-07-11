import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { ARTICLES } from "@/data/foundations";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicIman() {
  const { n = "1" } = useParams();
  const num = Math.max(1, Math.min(ARTICLES.length, parseInt(n, 10) || 1));
  const a = ARTICLES.find((x) => x.n === num) ?? ARTICLES[0];
  const prev = num > 1 ? num - 1 : null;
  const next = num < ARTICLES.length ? num + 1 : null;
  const url = `${window.location.origin}/iman/${num}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `iman:${num}`,
      title: `Article ${num} of Īmān — ${a.translit} (${a.en}) · Heartify`,
      text: `${a.ar} — ${a.translit}: ${a.summary}`,
      url,
    });
    await track("iman.shared", { n: num });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`Article ${num} of Īmān — ${a.translit} (${a.en}) · Heartify`}
        description={`${a.translit}: ${a.summary}`}
        path={`/iman/${num}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Heart className="h-4 w-4 text-primary" />
              Article {num} of 6 · Arkān al-Īmān
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-5xl md:text-6xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {a.ar}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              {a.translit}{" "}
              <span className="text-muted-foreground text-2xl md:text-3xl">
                ({a.en})
              </span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-prose mx-auto">
              {a.summary}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/aqeedah">All 6 Articles of Faith</Link>
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
            <Link to={prev ? `/iman/${prev}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/iman/${next}` : "#"}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
