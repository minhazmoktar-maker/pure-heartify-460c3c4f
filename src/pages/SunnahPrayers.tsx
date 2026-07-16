import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Prayer = { id: string; name: string; rakats: string; time: string; virtue: string; source: string; category: "Rawatib" | "Nafl" | "Special" };

const PRAYERS: Prayer[] = [
  { id: "fajr-sunnah", name: "2 Sunnah before Fajr", rakats: "2", time: "Between adhan and iqamah of Fajr", virtue: "'Better than the world and all it contains.'", source: "Muslim 725", category: "Rawatib" },
  { id: "duhr-before", name: "4 Sunnah before Dhuhr", rakats: "4", time: "Before Dhuhr fard", virtue: "Part of the 12 Rawatib — a house in Paradise.", source: "Tirmidhi 415", category: "Rawatib" },
  { id: "duhr-after", name: "2 Sunnah after Dhuhr", rakats: "2", time: "After Dhuhr fard", virtue: "Part of the 12 Rawatib.", source: "Muslim 728", category: "Rawatib" },
  { id: "maghrib-after", name: "2 Sunnah after Maghrib", rakats: "2", time: "After Maghrib fard", virtue: "Part of the 12 Rawatib.", source: "Muslim 729", category: "Rawatib" },
  { id: "isha-after", name: "2 Sunnah after Isha", rakats: "2", time: "After Isha fard", virtue: "Part of the 12 Rawatib.", source: "Muslim 729", category: "Rawatib" },
  { id: "witr", name: "Witr", rakats: "1, 3, 5, 7 or 9", time: "After Isha until Fajr; best in the last third of the night", virtue: "'Allah is Witr and loves the witr.' Emphasized sunnah.", source: "Abu Dawud 1416", category: "Special" },
  { id: "tahajjud", name: "Tahajjud", rakats: "2 at a time, any number", time: "Last third of the night", virtue: "'The best prayer after the obligatory is the night prayer.'", source: "Muslim 1163", category: "Nafl" },
  { id: "duha", name: "Salat ad-Duha", rakats: "2 to 8", time: "After sunrise (≈15 min) until before Dhuhr", virtue: "Charity for every joint of the body.", source: "Muslim 720", category: "Nafl" },
  { id: "ishraq", name: "Salat al-Ishraq", rakats: "2", time: "≈15–20 min after sunrise (after sitting in dhikr from Fajr)", virtue: "Reward of a complete Hajj and Umrah.", source: "Tirmidhi 586", category: "Nafl" },
  { id: "awwabin", name: "Salat al-Awwabin", rakats: "6", time: "Between Maghrib and Isha", virtue: "Written among the oft-repentant.", source: "Tirmidhi 435", category: "Nafl" },
  { id: "tahiyyatul-masjid", name: "Tahiyyatul Masjid", rakats: "2", time: "On entering the masjid before sitting", virtue: "Greeting the House of Allah.", source: "Bukhari 444", category: "Special" },
  { id: "wudu", name: "Salat al-Wudu", rakats: "2", time: "After completing wudu, with full presence", virtue: "Paradise guaranteed (Bilal's hadith).", source: "Bukhari 1149", category: "Special" },
  { id: "istikharah", name: "Salat al-Istikharah", rakats: "2", time: "Any permissible time, before a decision", virtue: "Seeking Allah's choice in matters.", source: "Bukhari 1162", category: "Special" },
  { id: "tawbah", name: "Salat at-Tawbah", rakats: "2", time: "After a sin, followed by sincere istighfar", virtue: "Forgiveness promised.", source: "Abu Dawud 1521", category: "Special" },
  { id: "tasbih", name: "Salat at-Tasbih", rakats: "4", time: "Any time (daily, weekly, monthly, or yearly)", virtue: "Erases sins — old and new, hidden and open.", source: "Abu Dawud 1297", category: "Special" },
  { id: "hajah", name: "Salat al-Hajah", rakats: "2", time: "When in need", virtue: "Precedes a du'a for a specific need.", source: "Tirmidhi 479", category: "Special" },
];

const STORAGE_KEY = "sunnahPrayers.done";

const SunnahPrayers = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | Prayer["category"]>("All");
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => PRAYERS.filter(p => (cat === "All" || p.category === cat) && (!q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || p.virtue.toLowerCase().includes(q.toLowerCase()))), [q, cat]);
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Sunnah & Nafl Prayers Guide" description="Rawatib, tahajjud, duha, istikharah, tasbih and other voluntary prayers with times, rakats and virtues." path="/sunnah-prayers" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Moon className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Sunnah & Nafl Prayers</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Tracked</span><span className="text-sm font-medium">{count} / {PRAYERS.length}</span></div><Progress value={(count / PRAYERS.length) * 100} /></Card>
        <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search prayers…" className="pl-9" /></div><Button variant="outline" size="icon" aria-label="Reset" onClick={() => persist({})} title="Reset"><RotateCcw className="w-4 h-4" /></Button></div>
        <div className="flex flex-wrap gap-2">{(["All", "Rawatib", "Nafl", "Special"] as const).map(c => (<Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>))}</div>
        <div className="grid gap-3 md:grid-cols-2">{filtered.map(p => (
          <Card key={p.id} className={`p-4 cursor-pointer transition ${done[p.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [p.id]: !done[p.id] })}>
            <div className="flex items-start justify-between mb-2"><h3 className="font-semibold">{p.name}</h3><Badge variant="secondary">{p.rakats} rak'ah</Badge></div>
            <p className="text-micro text-muted-foreground mb-2">{p.time}</p>
            <p className="text-sm mb-2">{p.virtue}</p>
            <p className="text-micro text-muted-foreground">{p.source}</p>
          </Card>
        ))}</div>
      </div>
    </div>
  );
};

export default SunnahPrayers;
