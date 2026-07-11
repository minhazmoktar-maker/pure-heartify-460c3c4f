import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, CheckCircle2, HelpCircle, Search, ShieldAlert, Utensils, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Status = "haram" | "doubtful" | "halal";

type Entry = {
  key: string;         // canonical lowercase name / e-number
  aliases: string[];
  status: Status;
  note: string;
};

const DB: Entry[] = [
  // Clearly haram
  { key: "pork", aliases: ["pig", "swine", "bacon", "ham", "lard", "pancetta", "prosciutto"], status: "haram", note: "Derived from swine." },
  { key: "alcohol", aliases: ["ethanol", "ethyl alcohol", "wine", "beer", "rum", "brandy", "vodka", "liquor"], status: "haram", note: "Khamr — intoxicating." },
  { key: "gelatin", aliases: ["gelatine"], status: "doubtful", note: "Halal only if from certified halal-slaughtered animal or fish; often porcine or non-zabihah bovine." },
  { key: "rennet", aliases: [], status: "doubtful", note: "Animal-derived rennet must come from halal-slaughtered animal; microbial/vegetable rennet is halal." },
  { key: "l-cysteine", aliases: ["cysteine", "e920"], status: "doubtful", note: "May be derived from human hair or feathers; check source." },
  { key: "carmine", aliases: ["cochineal", "e120", "carminic acid"], status: "doubtful", note: "Insect-derived; scholarly views differ." },
  { key: "shellac", aliases: ["e904", "confectioner's glaze"], status: "doubtful", note: "Insect resin; scholarly views differ." },
  { key: "mono- and diglycerides", aliases: ["e471", "monoglycerides", "diglycerides"], status: "doubtful", note: "Can be plant or animal derived; verify source." },
  { key: "glycerin", aliases: ["glycerine", "glycerol", "e422"], status: "doubtful", note: "Plant, animal, or synthetic origin." },
  { key: "lecithin", aliases: ["e322"], status: "doubtful", note: "Usually soy (halal); if egg it's halal; animal lecithin needs verification." },
  { key: "whey", aliases: [], status: "doubtful", note: "Halal if from halal cheese; may involve non-halal rennet." },
  { key: "vanilla extract", aliases: [], status: "doubtful", note: "Traditional extract contains ethanol as solvent; look for alcohol-free." },
  { key: "natural flavors", aliases: ["natural flavour", "natural flavors"], status: "doubtful", note: "Vague label — can hide alcohol or animal derivatives." },
  { key: "enzymes", aliases: [], status: "doubtful", note: "Source (microbial vs animal) not always disclosed." },
  { key: "e441", aliases: [], status: "doubtful", note: "Gelatin." },
  // Clearly halal common items
  { key: "salt", aliases: [], status: "halal", note: "Mineral." },
  { key: "sugar", aliases: [], status: "halal", note: "Plant-based sweetener." },
  { key: "citric acid", aliases: ["e330"], status: "halal", note: "Fermentation-derived." },
  { key: "ascorbic acid", aliases: ["vitamin c", "e300"], status: "halal", note: "Synthetic/plant." },
  { key: "pectin", aliases: ["e440"], status: "halal", note: "Fruit-derived gelling agent — halal alternative to gelatin." },
  { key: "agar", aliases: ["agar-agar", "e406"], status: "halal", note: "Seaweed-derived." },
  { key: "carrageenan", aliases: ["e407"], status: "halal", note: "Seaweed-derived." },
  { key: "guar gum", aliases: ["e412"], status: "halal", note: "Plant-derived." },
  { key: "xanthan gum", aliases: ["e415"], status: "halal", note: "Microbial fermentation." },
];

function classify(token: string): Entry | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  for (const e of DB) {
    if (e.key === t) return e;
    if (e.aliases.includes(t)) return e;
    // partial match on multi-word key
    if (e.key.includes(" ") && t.includes(e.key)) return e;
  }
  // e-number pattern
  const m = t.match(/\be\d{3,4}\b/);
  if (m) {
    for (const e of DB) if (e.aliases.includes(m[0])) return e;
    return { key: m[0], aliases: [], status: "doubtful", note: "Unclassified E-number — verify source before consuming." };
  }
  return null;
}

const statusMeta: Record<Status, { label: string; color: string; Icon: any }> = {
  haram: { label: "Haram", color: "text-destructive", Icon: XCircle },
  doubtful: { label: "Doubtful / Mashbooh", color: "text-yellow-600 dark:text-yellow-500", Icon: AlertTriangle },
  halal: { label: "Halal", color: "text-emerald-600 dark:text-emerald-500", Icon: CheckCircle2 },
};

export default function HalalCheck() {
  const [text, setText] = useState("");
  const tokens = useMemo(
    () => text.split(/[,\n;()\[\]]/g).map((s) => s.trim()).filter(Boolean),
    [text]
  );
  const results = tokens.map((t) => ({ token: t, entry: classify(t) }));
  const worst: Status | null = results.some((r) => r.entry?.status === "haram")
    ? "haram"
    : results.some((r) => r.entry?.status === "doubtful")
    ? "doubtful"
    : results.some((r) => r.entry?.status === "halal")
    ? "halal"
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <Helmet>
        <title>Halal Ingredient Checker — Heartify</title>
        <meta name="description" content="Paste an ingredient list and check each item against a halal reference database." />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 pb-24 pt-24">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Utensils className="h-4 w-4" /> Food & Drink</div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Halal Ingredient Checker</h1>
          <p className="mt-1 text-muted-foreground">Paste an ingredient list — separated by commas or new lines — and each token is flagged as halal, doubtful, or haram.</p>
        </header>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary" />Ingredients</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={5}
              placeholder="e.g. sugar, gelatin, natural flavors, E120, citric acid, vanilla extract"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{tokens.length} token{tokens.length === 1 ? "" : "s"} detected</div>
              <Button variant="ghost" size="sm" onClick={() => setText("")}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        {worst && (
          <Card className="mb-6 border-2" style={{ borderColor: worst === "haram" ? "hsl(var(--destructive))" : worst === "doubtful" ? "rgb(202 138 4)" : "rgb(16 185 129)" }}>
            <CardContent className="flex items-center gap-3 py-4">
              <ShieldAlert className={`h-6 w-6 ${statusMeta[worst].color}`} />
              <div>
                <div className="font-semibold">Overall: {statusMeta[worst].label}</div>
                <p className="text-sm text-muted-foreground">Result reflects the strictest classification found. Unrecognized tokens are omitted.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          {results.map(({ token, entry }, i) => {
            const meta = entry ? statusMeta[entry.status] : null;
            return (
              <Card key={i}>
                <CardContent className="flex items-start gap-3 py-3">
                  {meta ? <meta.Icon className={`mt-0.5 h-5 w-5 ${meta.color}`} /> : <HelpCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />}
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{token}</div>
                      {entry ? (
                        <Badge variant={entry.status === "haram" ? "destructive" : entry.status === "halal" ? "secondary" : "outline"}>{meta!.label}</Badge>
                      ) : (
                        <Badge variant="outline">Unknown</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{entry ? entry.note : "Not in local database — verify with a certified halal reference."}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {tokens.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Paste an ingredient list above to see per-item verdicts.</CardContent></Card>
          )}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Disclaimer: This tool is a starting point, not a fatwa. Rulings on ambiguous items (gelatin, enzymes, natural flavors, E-numbers) differ between scholars and certification bodies. When in doubt, consult a trusted halal certifier or scholar.
        </p>
      </main>
    </div>
  );
}
