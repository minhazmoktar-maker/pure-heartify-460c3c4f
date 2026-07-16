import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, TreePine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Item = { id: string; name: string; description: string; source: string; category: "Rivers" | "Trees" | "Gates" | "Levels" | "People" };

const ITEMS: Item[] = [
  { id: "kawthar", name: "Al-Kawthar", description: "The Prophet's ﷺ river — whiter than milk, sweeter than honey. Whoever drinks will never thirst again.", source: "Bukhari 6579", category: "Rivers" },
  { id: "salsabil", name: "Salsabil", description: "A spring in Jannah described in Surah al-Insan (76:18).", source: "Qur'an 76:18", category: "Rivers" },
  { id: "tasnim", name: "Tasnim", description: "A pure drink for the muqarrabin (those brought near).", source: "Qur'an 83:27–28", category: "Rivers" },
  { id: "sidratul-muntaha", name: "Sidrat al-Muntaha", description: "The Lote-Tree of the Utmost Boundary at the seventh heaven — the Prophet ﷺ saw it during al-Isra' wal-Mi'raj.", source: "Qur'an 53:14; Bukhari 3887", category: "Trees" },
  { id: "tuba", name: "Tuba", description: "A tree in Jannah — a rider travels in its shade for 100 years without leaving it.", source: "Bukhari 3252", category: "Trees" },
  { id: "gate-rayyan", name: "Ar-Rayyan (Gate of the Fasters)", description: "None enter through it except those who fasted; after they enter, it is closed.", source: "Bukhari 1896", category: "Gates" },
  { id: "gate-salah", name: "Gate of Salah", description: "For those constant in prayer.", source: "Bukhari 3216", category: "Gates" },
  { id: "gate-jihad", name: "Gate of Jihad", description: "For the mujahidin.", source: "Bukhari 3216", category: "Gates" },
  { id: "gate-sadaqah", name: "Gate of Sadaqah", description: "For those generous in charity.", source: "Bukhari 3216", category: "Gates" },
  { id: "gate-hajj", name: "Gate of Hajj", description: "For those who performed Hajj sincerely.", source: "Bukhari 3216", category: "Gates" },
  { id: "firdaws", name: "Al-Firdaws al-A'la", description: "The highest level of Paradise — above it is the Throne of ar-Rahman. Ask Allah for it.", source: "Bukhari 2790", category: "Levels" },
  { id: "hundred-levels", name: "100 Levels", description: "'Paradise has 100 levels; between each two is like heaven and earth.'", source: "Bukhari 2790", category: "Levels" },
  { id: "wildan", name: "Al-Wildan al-Mukhalladun", description: "Eternal youths serving the people of Paradise.", source: "Qur'an 56:17", category: "People" },
  { id: "hur", name: "Al-Hur al-'In", description: "Companions of pure eyes prepared for the believers.", source: "Qur'an 56:22", category: "People" },
  { id: "prophets-siddiqun", name: "Company of Prophets & Siddiqin", description: "'Whoever obeys Allah and the Messenger — those are with the Prophets, siddiqin, martyrs, and the righteous.'", source: "Qur'an 4:69", category: "People" },
];

const STORAGE_KEY = "jannahDescriptions.read";

const JannahDescriptions = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | Item["category"]>("All");
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => ITEMS.filter(i => (cat === "All" || i.category === cat) && (!q.trim() || i.name.toLowerCase().includes(q.toLowerCase()) || i.description.toLowerCase().includes(q.toLowerCase()))), [q, cat]);
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Descriptions of Jannah (Paradise)" description="Rivers, trees, gates, levels and people of Paradise from Qur'an and authentic Sunnah." path="/jannah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><TreePine className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Descriptions of Jannah</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Reflected on</span><span className="text-sm font-medium">{count} / {ITEMS.length}</span></div><Progress value={(count / ITEMS.length) * 100} /></Card>
        <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-9" /></div><Button variant="outline" size="icon" aria-label="Reset" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        <div className="flex flex-wrap gap-2">{(["All", "Rivers", "Trees", "Gates", "Levels", "People"] as const).map(c => (<Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>))}</div>
        <div className="grid gap-3 md:grid-cols-2">{filtered.map(i => (
          <Card key={i.id} className={`p-4 cursor-pointer ${done[i.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [i.id]: !done[i.id] })}>
            <div className="flex items-start justify-between mb-2"><h3 className="font-semibold">{i.name}</h3><Badge variant="secondary">{i.category}</Badge></div>
            <p className="text-sm mb-2">{i.description}</p>
            <p className="text-micro text-muted-foreground">{i.source}</p>
          </Card>
        ))}</div>
      </div>
    </div>
  );
};

export default JannahDescriptions;
