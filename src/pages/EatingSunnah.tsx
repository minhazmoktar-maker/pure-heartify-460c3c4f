import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Sunnah = { id: string; title: string; detail: string; source: string; category: "Before" | "During" | "After" };

const SUNNAH: Sunnah[] = [
  { id: "wash-hands", title: "Wash hands before and after", detail: "'Blessing in food is in washing the hands before and after.'", source: "Tirmidhi 1846", category: "Before" },
  { id: "bismillah", title: "Say Bismillah", detail: "If forgotten at the start, say 'Bismillahi awwalahu wa akhirah'.", source: "Abu Dawud 3767", category: "Before" },
  { id: "right-hand", title: "Eat with the right hand", detail: "'When any one of you eats, let him eat with his right hand.'", source: "Muslim 2020", category: "During" },
  { id: "closest", title: "Eat from what is closest to you", detail: "Do not reach across the plate.", source: "Bukhari 5376", category: "During" },
  { id: "sit-floor", title: "Sit humbly, not reclining", detail: "'I do not eat while reclining.'", source: "Bukhari 5398", category: "During" },
  { id: "three-fingers", title: "Eat with three fingers if suitable", detail: "The Prophet ﷺ ate with three fingers and licked them afterward.", source: "Muslim 2032", category: "During" },
  { id: "no-blame", title: "Never criticize food", detail: "'The Prophet ﷺ never found fault with any food.'", source: "Bukhari 3563", category: "During" },
  { id: "third-third-third", title: "Third stomach rule", detail: "A third for food, a third for drink, a third for breath.", source: "Tirmidhi 2380", category: "During" },
  { id: "share", title: "Share and eat together", detail: "'Food for two suffices three, and food for three suffices four.'", source: "Muslim 2059", category: "During" },
  { id: "drink-sitting", title: "Drink sitting, in three breaths", detail: "Pause and breathe outside the cup, not into it.", source: "Muslim 2028", category: "During" },
  { id: "lick-fingers", title: "Lick fingers and clean the plate", detail: "'You do not know in which part of your food is the blessing.'", source: "Muslim 2033", category: "After" },
  { id: "dua-after", title: "Recite the du'a after eating", detail: "'Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah.'", source: "Tirmidhi 3458", category: "After" },
  { id: "avoid-waste", title: "Avoid extravagance and waste", detail: "'Eat and drink, but do not be wasteful' (Qur'an 7:31).", source: "Qur'an 7:31", category: "During" },
  { id: "no-hot", title: "Let hot food cool", detail: "'The Prophet ﷺ was brought hot food and said: leave it, for Allah has not fed us fire.'", source: "Hakim 7137", category: "Before" },
  { id: "no-standing", title: "Avoid drinking standing", detail: "Generally discouraged; permitted when there is a need.", source: "Muslim 2024", category: "During" },
];

const STORAGE_KEY = "eatingSunnah.done";

const EatingSunnah = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | Sunnah["category"]>("All");
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => SUNNAH.filter(s => (cat === "All" || s.category === cat) && (!q.trim() || s.title.toLowerCase().includes(q.toLowerCase()) || s.detail.toLowerCase().includes(q.toLowerCase()))), [q, cat]);
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Sunnahs of Eating & Drinking" description="Prophetic manners of the meal: before, during, and after — with authentic references." path="/eating-sunnah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Utensils className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Sunnahs of Eating</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Practicing</span><span className="text-sm font-medium">{count} / {SUNNAH.length}</span></div><Progress value={(count / SUNNAH.length) * 100} /></Card>
        <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-9" /></div><Button variant="outline" size="icon" aria-label="Reset" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        <div className="flex flex-wrap gap-2">{(["All", "Before", "During", "After"] as const).map(c => (<Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>))}</div>
        <div className="grid gap-3 md:grid-cols-2">{filtered.map(s => (
          <Card key={s.id} className={`p-4 cursor-pointer ${done[s.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [s.id]: !done[s.id] })}>
            <div className="flex items-start justify-between mb-2"><h3 className="font-semibold">{s.title}</h3><Badge variant="secondary">{s.category}</Badge></div>
            <p className="text-sm mb-2">{s.detail}</p>
            <p className="text-micro text-muted-foreground">{s.source}</p>
          </Card>
        ))}</div>
      </div>
    </div>
  );
};

export default EatingSunnah;
