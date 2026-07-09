import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Droplets, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

type Kind = "fard" | "sunnah";
type Step = { title: string; detail: string; kind: Kind };

const WUDU: Step[] = [
  { kind: "sunnah", title: "Bismillah", detail: "Begin with 'Bismillah' — 'In the name of Allah'." },
  { kind: "sunnah", title: "Wash hands 3×", detail: "Wash both hands up to the wrists three times." },
  { kind: "sunnah", title: "Rinse mouth 3×", detail: "Take water into the mouth and swish it around, three times." },
  { kind: "sunnah", title: "Sniff & blow nose 3×", detail: "Sniff water into the nose and expel with the left hand, three times." },
  { kind: "fard", title: "Wash face 3×", detail: "From hairline to chin, ear to ear — three times." },
  { kind: "fard", title: "Wash arms to elbows 3×", detail: "Right arm first up to and including the elbow, then the left, three times each." },
  { kind: "fard", title: "Wipe head once", detail: "Pass wet hands from forehead back to the nape and return." },
  { kind: "sunnah", title: "Wipe ears", detail: "Insert index fingers into the ears; wipe behind with the thumbs." },
  { kind: "fard", title: "Wash feet to ankles 3×", detail: "Start with the right foot, including between the toes and up to and including the ankles." },
  { kind: "sunnah", title: "Shahadah after wudu", detail: "Say: 'Ash-hadu an la ilaha illa-llah, wahdahu la sharika lah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh.'" },
];

const GHUSL: Step[] = [
  { kind: "sunnah", title: "Intention (niyyah)", detail: "Intend to purify yourself from major impurity." },
  { kind: "sunnah", title: "Bismillah & wash hands", detail: "Say Bismillah and wash both hands three times." },
  { kind: "sunnah", title: "Wash private parts", detail: "Wash the private parts and any traces of impurity." },
  { kind: "sunnah", title: "Perform wudu", detail: "Perform a complete wudu (some scholars delay washing the feet to the end)." },
  { kind: "fard", title: "Pour water over the head 3×", detail: "Ensure water reaches the roots of the hair on the entire scalp." },
  { kind: "fard", title: "Wash the right side of the body", detail: "From shoulder to feet, ensuring water reaches every part of the skin." },
  { kind: "fard", title: "Wash the left side of the body", detail: "Same as the right; then rub the body to be certain no dry spot remains." },
  { kind: "sunnah", title: "Wash feet last (if delayed)", detail: "If you didn't wash them during wudu, wash them now, moving away from the washing spot." },
];

const TAYAMMUM: Step[] = [
  { kind: "sunnah", title: "Intention", detail: "Intend to remove ritual impurity in the absence of usable water." },
  { kind: "fard", title: "Strike clean earth once", detail: "Place both palms lightly on clean dry earth, sand, stone, or dust." },
  { kind: "fard", title: "Wipe the face", detail: "Wipe the whole face once with both palms." },
  { kind: "fard", title: "Wipe the hands to the wrists", detail: "Wipe the back of the right hand with the left palm, then the back of the left with the right." },
];

const GUIDES = {
  wudu: { label: "Wudu", steps: WUDU, note: "Do steps in order. Sequence and continuity are recommended." },
  ghusl: { label: "Ghusl", steps: GHUSL, note: "The three faraid are intention, rinsing the mouth & nose, and washing the entire body." },
  tayammum: { label: "Tayammum", steps: TAYAMMUM, note: "Only permissible when water is unavailable or harmful to use." },
} as const;

type GuideKey = keyof typeof GUIDES;
const STORAGE = "heartify.wudu.v1";

export default function WuduGuide() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setDone(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(done));
  }, [done]);

  const key = (guide: GuideKey, idx: number) => `${guide}:${idx}`;

  const reset = (guide: GuideKey) =>
    setDone((d) => {
      const next = { ...d };
      GUIDES[guide].steps.forEach((_, i) => delete next[key(guide, i)]);
      return next;
    });

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <SEO
        title="Wudu, Ghusl & Tayammum Guide | Heartify"
        description="Step-by-step interactive guides for wudu, ghusl, and tayammum with fard and sunnah acts clearly marked."
        path="/wudu"
      />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Droplets className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Purification Guide</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Tabs defaultValue="wudu">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wudu">Wudu</TabsTrigger>
            <TabsTrigger value="ghusl">Ghusl</TabsTrigger>
            <TabsTrigger value="tayammum">Tayammum</TabsTrigger>
          </TabsList>

          {(Object.keys(GUIDES) as GuideKey[]).map((g) => {
            const guide = GUIDES[g];
            const doneCount = guide.steps.filter((_, i) => done[key(g, i)]).length;
            const pct = Math.round((doneCount / guide.steps.length) * 100);
            return (
              <TabsContent key={g} value={g} className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">{guide.label}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">{guide.note}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => reset(g)}>
                      <RotateCcw className="mr-1 h-4 w-4" /> Reset
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{doneCount} / {guide.steps.length}</span>
                  </div>
                  <Progress value={pct} className="mt-1 h-2" />
                </Card>

                <ol className="space-y-2">
                  {guide.steps.map((step, i) => {
                    const isDone = !!done[key(g, i)];
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => setDone((d) => ({ ...d, [key(g, i)]: !d[key(g, i)] }))}
                          className={`w-full rounded-lg border p-4 text-left transition-colors ${
                            isDone ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                              {isDone ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-medium">{step.title}</h3>
                                <Badge
                                  variant="secondary"
                                  className={
                                    step.kind === "fard"
                                      ? "bg-primary/15 text-primary"
                                      : "bg-muted text-muted-foreground"
                                  }
                                >
                                  {step.kind}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </TabsContent>
            );
          })}
        </Tabs>

        <Card className="p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Nullifiers of wudu:</strong> passing wind, urine or
          stool, deep sleep, loss of consciousness, and direct contact with impurity (per most
          scholars). When any of these occur, renew wudu before the next prayer.
        </Card>
      </main>
    </div>
  );
}
