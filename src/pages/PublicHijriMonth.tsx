import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Moon, ChevronLeft, ChevronRight } from "lucide-react";
import { HIJRI_MONTHS } from "@/data/hijriMonths";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const SACRED = new Set(["muharram", "rajab", "dhu-al-qadah", "dhu-al-hijjah"]);

export default function PublicHijriMonth() {
  const { slug = HIJRI_MONTHS[0].slug } = useParams();
  const idx = Math.max(0, HIJRI_MONTHS.findIndex((m) => m.slug === slug));
  const m = HIJRI_MONTHS[idx] ?? HIJRI_MONTHS[0];
  const prev = idx > 0 ? HIJRI_MONTHS[idx - 1] : null;
  const next = idx < HIJRI_MONTHS.length - 1 ? HIJRI_MONTHS[idx + 1] : null;
  const url = `${window.location.origin}/hijri-month/${m.slug}`;
  const sacred = SACRED.has(m.slug);

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `hijri-month:${m.slug}`,
      title: `${m.translit} (${m.ar}) · Heartify`,
      text: `${m.translit} — ${m.summary}`,
      url,
    });
    await track("hijri_month.shared", { slug: m.slug });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${m.translit} (${m.en}) — Islamic Month ${m.n} of 12 · Heartify`}
        description={`${m.translit}: ${m.summary}`}
        path={`/hijri-month/${m.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Moon className="h-4 w-4 text-primary" />
              Month {m.n} of 12 · Hijri Calendar
              {sacred && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  Sacred month
                </span>
              )}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-6xl md:text-7xl leading-loose text-primary"
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
            <p className="text-sm text-muted-foreground italic">Meaning: {m.meaning}</p>
            <p className="text-base md:text-lg text-muted-foreground max-w-prose mx-auto">
              {m.summary}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/hijri">Open Hijri Calendar</Link>
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
            <Link to={prev ? `/hijri-month/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/hijri-month/${next.slug}` : "#"}>
              {next ? next.translit : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
