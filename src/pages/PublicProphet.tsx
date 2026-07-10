import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { PROPHETS } from "@/data/prophets";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicProphet() {
  const { slug = PROPHETS[0].slug } = useParams();
  const idx = Math.max(0, PROPHETS.findIndex((p) => p.slug === slug));
  const prophet = PROPHETS[idx] ?? PROPHETS[0];
  const prev = idx > 0 ? PROPHETS[idx - 1] : null;
  const next = idx < PROPHETS.length - 1 ? PROPHETS[idx + 1] : null;
  const url = `${window.location.origin}/prophet/${prophet.slug}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `prophet:${prophet.slug}`,
      title: `${prophet.translit} (${prophet.en}) · Heartify`,
      text: `${prophet.ar} — ${prophet.translit}: ${prophet.summary}`,
      url,
    });
    await track("prophet.shared", { slug: prophet.slug });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${prophet.translit} (${prophet.en}) — Prophet in Islam · Heartify`}
        description={`${prophet.translit} (${prophet.en}): ${prophet.summary} Learn about the 25 prophets named in the Qur'ān on Heartify.`}
        path={`/prophet/${prophet.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Prophet {idx + 1} of {PROPHETS.length} · Anbiyāʾ
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-6xl md:text-7xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {prophet.ar}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              {prophet.translit}{" "}
              <span className="text-muted-foreground text-2xl md:text-3xl">
                ({prophet.en})
              </span>
            </h1>
            {prophet.bible && (
              <p className="text-sm text-muted-foreground">
                Known in earlier scripture as <em>{prophet.bible}</em>
              </p>
            )}
            <p className="text-base md:text-lg text-muted-foreground max-w-prose mx-auto">
              {prophet.summary}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/prophets">Explore all Prophets</Link>
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
            <Link to={prev ? `/prophet/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/prophet/${next.slug}` : "#"}>
              {next ? next.translit : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
