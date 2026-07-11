import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Scroll, MapPin, Calendar, ChevronLeft, ChevronRight, CalendarX } from "lucide-react";
import { SEERAH_EVENTS } from "@/data/seerah";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicSeerah() {
  const { id = "" } = useParams();
  const idx = SEERAH_EVENTS.findIndex((e) => e.id === id);
  const event = idx >= 0 ? SEERAH_EVENTS[idx] : null;
  const prev = idx > 0 ? SEERAH_EVENTS[idx - 1] : null;
  const next = idx >= 0 && idx < SEERAH_EVENTS.length - 1 ? SEERAH_EVENTS[idx + 1] : null;

  if (!event) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Seerah event not found — Heartify" description="This Seerah event could not be found." path={`/seerah/${id}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={CalendarX}
            title="Event not found"
            description="This event from the Seerah could not be found. Open the full timeline to continue your journey."
            actionLabel="Open the Seerah timeline"
            actionHref="/seerah"
          />
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/seerah/${event.id}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `seerah:${event.id}`,
      title: `${event.title} · Heartify`,
      text: `📜 ${event.title} (${event.year}) — ${event.summary}`,
      url,
    });
    await track("seerah.shared", { id: event.id });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${event.title} — ${event.year} · Seerah · Heartify`}
        description={`${event.title} at ${event.place} (${event.year}): ${event.summary}`}
        path={`/seerah/${event.id}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Scroll className="h-4 w-4 text-primary" /> Seerah · {event.phase}
              </span>
              <span>Event {idx + 1} of {SEERAH_EVENTS.length}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {event.year}{event.hijri ? ` · ${event.hijri}` : ""}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.place}</span>
            </div>
            <p className="text-base md:text-lg leading-relaxed border-l-2 border-primary/40 pl-4">
              {event.summary}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/seerah">Full Seerah timeline</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/seerah/${prev.id}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.title : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/seerah/${next.id}` : "#"}>
              {next ? next.title : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
