import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Moon, Plus, Search, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

type DreamKind = "good" | "bad" | "neutral";
type Dream = {
  id: string;
  date: string;
  title: string;
  body: string;
  kind: DreamKind;
};

const STORAGE = "heartify.dreams.v1";

const SYMBOLS: { symbol: string; meaning: string }[] = [
  { symbol: "Water (clean)", meaning: "Knowledge, life, purity — Ibn Sirin: clear water is beneficial ilm." },
  { symbol: "Water (dirty)", meaning: "Sorrow or unlawful earnings; a call to seek forgiveness." },
  { symbol: "Milk", meaning: "Fitrah and pure knowledge (Prophet ﷺ was offered milk on Isra)." },
  { symbol: "Honey", meaning: "The Qur'an, healing, and lawful sweetness of life." },
  { symbol: "Snake", meaning: "An enemy — its strength matches the snake's size." },
  { symbol: "Fire", meaning: "Warning, fitnah, or — if warming — authority and provision." },
  { symbol: "Green pastures", meaning: "Islam, Jannah, and righteous company." },
  { symbol: "Flying", meaning: "Rising in status, travel, or spiritual elevation." },
  { symbol: "Losing teeth", meaning: "Loss of family members' age; or debts being cleared." },
  { symbol: "Weeping without wailing", meaning: "Relief and joy to come." },
  { symbol: "The Ka'bah", meaning: "The imam / leader / one's father; safety and guidance." },
  { symbol: "Reciting Qur'an", meaning: "Honour, wisdom, and being spoken well of." },
  { symbol: "Wedding", meaning: "Often a blessing; sometimes a trial requiring patience." },
  { symbol: "Rain (gentle)", meaning: "Mercy and rizq descending on the dreamer's household." },
  { symbol: "White clothes", meaning: "Deen, purity of state, and good repute." },
  { symbol: "Riding a horse", meaning: "Nobility, victory, and beneficial travel." },
  { symbol: "Seeing the Prophet ﷺ", meaning: "Truth — Shaytan cannot take his form. A great glad-tiding." },
];

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Dreams() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<{ title: string; body: string; kind: DreamKind }>({
    title: "",
    body: "",
    kind: "neutral",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setDreams(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(dreams));
  }, [dreams]);

  const add = () => {
    if (!draft.title.trim()) return;
    setDreams((d) => [
      { id: uid(), date: new Date().toISOString(), ...draft },
      ...d,
    ]);
    setDraft({ title: "", body: "", kind: "neutral" });
  };

  const del = (id: string) => setDreams((d) => d.filter((x) => x.id !== id));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return dreams;
    return dreams.filter(
      (d) =>
        d.title.toLowerCase().includes(s) ||
        d.body.toLowerCase().includes(s) ||
        d.kind.includes(s),
    );
  }, [dreams, q]);

  const filteredSymbols = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return SYMBOLS;
    return SYMBOLS.filter(
      (x) => x.symbol.toLowerCase().includes(s) || x.meaning.toLowerCase().includes(s),
    );
  }, [q]);

  const counts = useMemo(
    () => ({
      good: dreams.filter((d) => d.kind === "good").length,
      bad: dreams.filter((d) => d.kind === "bad").length,
      neutral: dreams.filter((d) => d.kind === "neutral").length,
    }),
    [dreams],
  );

  const kindBadge = (k: DreamKind) =>
    k === "good" ? "bg-emerald-500/15 text-emerald-500" :
    k === "bad" ? "bg-red-500/15 text-red-500" :
    "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <SEO
        title="Islamic Dream Journal | Heartify"
        description="Record dreams, mark them good, bad, or neutral, and consult a library of classical dream symbols and their meanings."
        canonical="/dreams"
      />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Moon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Dream Journal</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            The Prophet ﷺ said: "A good dream is from Allah, a bad one from Shaytan. If one sees
            what he dislikes, let him spit lightly to his left three times, seek refuge in Allah
            from its evil, and not tell anyone — it will not harm him." (Bukhari &amp; Muslim)
          </p>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Good</div>
            <div className="text-2xl font-bold text-emerald-500">{counts.good}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Neutral</div>
            <div className="text-2xl font-bold">{counts.neutral}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Bad</div>
            <div className="text-2xl font-bold text-red-500">{counts.bad}</div>
          </Card>
        </div>

        <Tabs defaultValue="journal">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="symbols">
              <BookOpen className="mr-1 h-4 w-4" /> Symbols
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="space-y-4">
            <Card className="space-y-3 p-4">
              <Input
                placeholder="Dream title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              <Textarea
                placeholder="Describe your dream…"
                rows={4}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                {(["good", "neutral", "bad"] as DreamKind[]).map((k) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={draft.kind === k ? "default" : "outline"}
                    onClick={() => setDraft({ ...draft, kind: k })}
                  >
                    {k}
                  </Button>
                ))}
                <div className="ml-auto">
                  <Button onClick={add} disabled={!draft.title.trim()}>
                    <Plus className="mr-1 h-4 w-4" /> Save
                  </Button>
                </div>
              </div>
              {draft.kind === "bad" && (
                <p className="text-xs text-muted-foreground">
                  Sunnah: spit lightly 3× to the left, say A'udhu billahi min ash-shaytan,
                  change sides, pray 2 rak'ahs, and don't share it.
                </p>
              )}
            </Card>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search your dreams…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                No dreams yet. Log one above.
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((d) => (
                  <Card key={d.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium">{d.title}</h3>
                          <Badge className={kindBadge(d.kind)} variant="secondary">
                            {d.kind}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(d.date).toLocaleString()}
                        </p>
                        {d.body && (
                          <p className="mt-2 whitespace-pre-wrap text-sm">{d.body}</p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => del(d.id)}
                        aria-label="Delete dream"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="symbols" className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search symbols (water, snake, fire…)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Concise notes inspired by Ibn Sirin's <em>Ta'bir al-Ru'ya</em>. Interpretations
              vary by context and dreamer — treat as guidance, not verdicts.
            </p>
            {filteredSymbols.map((s) => (
              <Card key={s.symbol} className="p-4">
                <div className="font-medium">{s.symbol}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.meaning}</div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
