import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { ISLAMIC_EVENTS } from "@/data/islamicEvents";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const LABEL: Record<string, string> = {
  "sacred-night": "Sacred Night",
  fast: "Fast",
  eid: "ʿĪd",
  historical: "Historical",
  day: "Blessed Day",
};

export default function PublicIslamicEvent() {
  const { slug = ISLAMIC_EVENTS[0].slug } = useParams();
  const idx = Math.max(0, ISLAMIC_EVENTS.findIndex((e) => e.slug === slug));
  const e = ISLAMIC_EVENTS[idx] ?? ISLAMIC_EVENTS[0];
  const prev = idx > 0 ? ISLAMIC_EVENTS[idx - 1] : null;
  const next = idx < ISLAMIC_EVENTS.length - 1 ? ISLAMIC_EVENTS[idx + 1] : null;
  const url = `${window.location.origin}/event/${e.slug}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `event:${e.slug}`,
      title: `${e.translit} · Heartify`,
      text: `${e.ar} — ${e.translit} (${e.when}): ${e.summary}`,
      url,
    });
    await track("event.shared", { slug: e.slug });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${e.translit} (${e.en}) — ${LABEL[e.category]} · Heartify`}
        description={`${e.translit} — ${e.when}. ${e.summary}`}
        path={`/event/${e.slug}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-10 pb-10 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              {LABEL[e.category]} · Event {idx + 1} of {ISLAMIC_EVENTS.length}
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-5xl md:text-6xl leading-loose text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {e.ar}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              {e.translit}{" "}
              <span className="text-muted-foreground text-2xl md:text-3xl">
                ({e.en})
              </span>
            </h1>
            <p className="text-sm text-primary/80 font-medium">{e.when}</p>
            <p className="text-base md:text-lg text-muted-foreground max-w-prose mx-auto">
              {e.summary}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/events">Explore all Events</Link>
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
            <Link to={prev ? `/event/${prev.slug}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {prev ? prev.translit : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/event/${next.slug}` : "#"}>
              {next ? next.translit : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
