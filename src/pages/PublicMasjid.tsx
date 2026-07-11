import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Landmark, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { SACRED_MOSQUES } from "@/data/sacredMosques";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicMasjid() {
  const { slug = SACRED_MOSQUES[0].slug } = useParams();
  const idx = Math.max(0, SACRED_MOSQUES.findIndex((m) => m.slug === slug));
  const m = SACRED_MOSQUES[idx] ?? SACRED_MOSQUES[0];
  const prev = idx > 0 ? SACRED_MOSQUES[idx - 1] : null;
  const next = idx < SACRED_MOSQUES.length - 1 ? SACRED_MOSQUES[idx + 1] : null;
  const url = `${window.location.origin}/masjid/${m.slug}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `masjid:${m.slug}`,
      title: `${m.translit} · Heartify`,
      text: `${m.ar} — ${m.translit} (${m.city}, ${m.country}): ${m.summary}`,
      url,
    });
    await track("masjid.shared", { slug: m.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${m.translit} (${m.en}) — ${m.city}, ${m.country} · Heartify`}
        description={`${m.translit} in ${m.city}, ${m.country}. ${m.summary}`}
        path={`/masjid/${m.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Landmark className="h-4 w-4 text-primary" />
              Sacred Site · {idx + 1} of {SACRED_MOSQUES.length}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-5xl md:text-6xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {m.ar}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              {m.translit}{" "}
              <span className="text-muted-foreground text-2xl md:text-3xl">
                ({m.en})
              </span>
            </h1>
            <p className="inline-flex items-center gap-1.5 text-sm text-primary/80 font-medium">
              <MapPin className="h-4 w-4" /> {m.city}, {m.country}
            </p>
            {m.founded && (
              <p className="text-xs text-muted-foreground italic">
                Founded: {m.founded}
              </p>
            )}
            <p className="text-base md:text-lg text-muted-foreground max-w-prose mx-auto">
              {m.summary}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/mosques">Explore all Sacred Mosques</Link>
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
            <Link to={prev ? `/masjid/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/masjid/${next.slug}` : "#"}>
              {next ? next.translit : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
