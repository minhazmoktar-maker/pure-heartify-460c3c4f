import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Remedy = { id: string; name: string; arabic?: string; benefits: string[]; usage: string; source: string };

const REMEDIES: Remedy[] = [
  { id: "black-seed", name: "Black Seed (Habbat as-Sawda')", arabic: "الحبة السوداء", benefits: ["Immune support", "Anti-inflammatory", "Digestive aid"], usage: "1 tsp of seeds or ½ tsp of cold-pressed oil daily, ideally with honey.", source: "'Cure for every disease except death.' — Bukhari 5688" },
  { id: "honey", name: "Honey", arabic: "العسل", benefits: ["Wound healing", "Cough relief", "Gut health"], usage: "1–2 tbsp raw honey daily; apply topically to burns and wounds.", source: "'In it is healing for people.' — Qur'an 16:69" },
  { id: "olive-oil", name: "Olive Oil", arabic: "زيت الزيتون", benefits: ["Heart health", "Skin and hair", "Anti-inflammatory"], usage: "Extra virgin, cold-pressed. Take 1 tbsp daily or cook with it.", source: "'Eat olive oil and anoint yourselves with it.' — Tirmidhi 1851" },
  { id: "dates", name: "Dates ('Ajwa)", arabic: "التمر", benefits: ["Protection from poison and magic (Ajwa 7 in morning)", "Energy", "Iron"], usage: "7 'Ajwa dates on empty stomach in the morning.", source: "Bukhari 5445" },
  { id: "miswak", name: "Miswak (Salvadora persica)", arabic: "السواك", benefits: ["Oral hygiene", "Anti-bacterial", "Gum health"], usage: "Use before every salah, wudu, waking, and entering home.", source: "'If it wouldn't be a burden, I would order it before every salah.' — Bukhari 887" },
  { id: "talbina", name: "Talbina (Barley Porridge)", arabic: "التلبينة", benefits: ["Soothes grief and anxiety", "Digestive comfort", "Heart tonic"], usage: "Boil 2 tbsp barley flour in water/milk with honey. Take when sick or sad.", source: "'Talbina soothes the sick and removes some of the sorrow.' — Bukhari 5689" },
  { id: "zamzam", name: "Zamzam Water", arabic: "ماء زمزم", benefits: ["Blessed water — intention-based benefit", "Nourishment (Prophet Ismail's mother)"], usage: "Drink facing qiblah, standing, in three breaths; make du'a with each sip.", source: "'The water of Zamzam is for whatever it is drunk for.' — Ibn Majah 3062" },
  { id: "hijamah", name: "Hijamah (Cupping)", arabic: "الحجامة", benefits: ["Circulation", "Pain relief", "Detoxification (traditional)"], usage: "Best on 17th, 19th, 21st of the lunar month. Seek a certified practitioner.", source: "'The best of what you treat yourselves with is hijamah.' — Bukhari 5696" },
  { id: "sana", name: "Senna (Sana Makki)", arabic: "السنا", benefits: ["Natural laxative", "Digestive cleanse"], usage: "Steep as tea, short-term use only. Avoid in pregnancy.", source: "'In senna is a cure for every disease except sam (death).' — Ibn Majah 3457" },
  { id: "qust", name: "Sea Qust (Costus)", arabic: "القسط البحري", benefits: ["Throat and tonsils", "Pleurisy (traditional)"], usage: "Ground and taken with water, honey, or olive oil.", source: "Bukhari 5692" },
];

const STORAGE_KEY = "tibb.read";

const TibbNabawi = () => {
  const [q, setQ] = useState("");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => REMEDIES.filter(r => !q.trim() || r.name.toLowerCase().includes(q.toLowerCase()) || r.benefits.some(b => b.toLowerCase().includes(q.toLowerCase()))), [q]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / REMEDIES.length) * 100);
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Tibb an-Nabawi (Prophetic Medicine) — Heartify" description="Prophetic natural remedies: black seed, honey, olive oil, dates, miswak, hijamah, and more." path="/tibb" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><Leaf className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Prophetic Medicine (Tibb an-Nabawi)</h1></div>
          <p className="mt-2 text-muted-foreground">Natural remedies recommended by the Prophet ﷺ. Educational — not a replacement for medical care.</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Read</span><span className="text-sm text-muted-foreground">{readCount} / {REMEDIES.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search remedies…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(r => (
            <Card key={r.id} className={`p-5 cursor-pointer transition ${read[r.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...read, [r.id]: !read[r.id] })}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1"><div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-xl font-semibold">{r.name}</h2>{r.arabic && <span className="text-lg" dir="rtl">{r.arabic}</span>}</div></div>
                {read[r.id] && <Badge>Read</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">{r.benefits.map(b => <Badge key={b} variant="secondary">{b}</Badge>)}</div>
              <p className="mt-3 text-sm"><span className="font-medium">Usage: </span><span className="text-muted-foreground">{r.usage}</span></p>
              <p className="mt-2 text-xs text-muted-foreground italic">{r.source}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default TibbNabawi;
