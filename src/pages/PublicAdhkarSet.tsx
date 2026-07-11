import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Sunrise, ChevronLeft, ChevronRight, Repeat, BookMarked } from "lucide-react";
import { ADHKAR } from "@/data/adhkar";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicAdhkarSet() {
  const { id = "" } = useParams();
  const idx = ADHKAR.findIndex((c) => c.id === id);
  const set = idx >= 0 ? ADHKAR[idx] : null;
  const prev = idx > 0 ? ADHKAR[idx - 1] : null;
  const next = idx >= 0 && idx < ADHKAR.length - 1 ? ADHKAR[idx + 1] : null;

  if (!set) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Adhkār set not found — Heartify" description="This adhkār collection could not be found." path={`/adhkar-set/${id}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={BookMarked}
            title="Adhkār set not found"
            description="This adhkār collection could not be found. Explore the full Adhkār library to continue your remembrance."
            actionLabel="Open Adhkār"
            actionHref="/adhkar"
          />
        </main>
      </div>
    );
  }

  const url = `${window.location.origin}/adhkar-set/${set.id}`;
  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `adhkar-set:${set.id}`,
      title: `${set.title} · Heartify`,
      text: `📿 ${set.title} — ${set.description}`,
      url,
    });
    await track("adhkar_set.shared", { id: set.id });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${set.title} — Sunnah adhkār · Heartify`}
        description={`${set.description} ${set.items.length} authentic remembrances with Arabic, transliteration and meaning.`}
        path={`/adhkar-set/${set.id}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-4 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              <Sunrise className="h-4 w-4 text-primary" /> Adhkār · {idx + 1} of {ADHKAR.length}
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold">{set.title}</h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-prose mx-auto">{set.description}</p>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          {set.items.map((d, i) => (
            <Card key={d.id} className="border-border/60">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">#{i + 1} · {d.translit}</span>
                  <span className="inline-flex items-center gap-1"><Repeat className="h-3.5 w-3.5" /> ×{d.repeat}</span>
                </div>
                <p dir="rtl" lang="ar" className="text-2xl md:text-3xl leading-loose text-primary text-right"
                   style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
                  {d.arabic}
                </p>
                <p className="text-sm md:text-base leading-relaxed border-l-2 border-primary/40 pl-4">
                  {d.meaning}
                </p>
                {d.reference && (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <BookMarked className="h-3.5 w-3.5" /> {d.reference}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/adhkar">Open full Adhkār</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/adhkar-set/${prev.id}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.title : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/adhkar-set/${next.id}` : "#"}>
              {next ? next.title : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
