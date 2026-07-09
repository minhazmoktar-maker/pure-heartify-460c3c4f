import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Trait = { id: string; name: string; type: "Virtue" | "Vice"; description: string; remedy: string; source: string };

const TRAITS: Trait[] = [
  { id: "sincerity", name: "Ikhlas (Sincerity)", type: "Virtue", description: "Doing every deed purely for Allah, seeking no praise or worldly reward.", remedy: "Hide voluntary acts. Renew intention often. Recall 'they were not commanded except to worship Allah with sincere devotion' (98:5).", source: "Qur'an 98:5; Bukhari 1" },
  { id: "sabr", name: "Sabr (Patience)", type: "Virtue", description: "Endurance in obedience, in avoiding sin, and under trial.", remedy: "Remember 'Allah is with the patient' (2:153). Look at those with less. Make du'a for sabr.", source: "Qur'an 2:153; Bukhari 1469" },
  { id: "shukr", name: "Shukr (Gratitude)", type: "Virtue", description: "Recognizing all favors as from Allah and using them in His obedience.", remedy: "Daily count 3 blessings. Say 'Alhamdulillah' often. Serve those in less.", source: "Qur'an 14:7" },
  { id: "tawakkul", name: "Tawakkul (Trust)", type: "Virtue", description: "Reliance on Allah after tying the camel — effort with surrender.", remedy: "Recite 'Hasbunallahu wa ni'mal wakil' in worry. Study Surah at-Talaq 2–3.", source: "Qur'an 65:3; Tirmidhi 2517" },
  { id: "haya", name: "Haya' (Modesty)", type: "Virtue", description: "Shame from Allah that prevents sin and inspires nobility.", remedy: "Remember Allah sees you. Guard the tongue, gaze, and dress.", source: "Bukhari 24" },
  { id: "tawadu", name: "Tawadu' (Humility)", type: "Virtue", description: "Lowering oneself before truth and before the servants of Allah.", remedy: "Sit with the poor. Serve family. Reject compliments internally.", source: "Muslim 2865" },
  { id: "rahma", name: "Rahmah (Mercy)", type: "Virtue", description: "Compassion toward all creation — human, animal, environment.", remedy: "'The merciful are shown mercy by ar-Rahman.' Practice small kindnesses daily.", source: "Tirmidhi 1924" },
  { id: "sidq", name: "Sidq (Truthfulness)", type: "Virtue", description: "Truth in speech, intention, and action.", remedy: "'Truthfulness leads to righteousness, and righteousness to Paradise.' Never lie, even in jest.", source: "Bukhari 6094" },
  { id: "kibr", name: "Kibr (Arrogance)", type: "Vice", description: "Rejecting truth and looking down on people.", remedy: "'No one enters Paradise with an atom of arrogance.' Remember your origin (drop of fluid) and end (dust).", source: "Muslim 91" },
  { id: "hasad", name: "Hasad (Envy)", type: "Vice", description: "Wishing the removal of another's blessing.", remedy: "Say 'Ma sha Allah, tabarak Allah'. Make du'a for the person. Give them a gift.", source: "Abu Dawud 4903" },
  { id: "ghibah", name: "Ghibah (Backbiting)", type: "Vice", description: "Mentioning your brother in a way he'd dislike, even if true.", remedy: "'Like eating the flesh of your dead brother' (49:12). Leave the gathering or change the topic. Seek forgiveness from Allah; seek pardon from the person only if it won't cause worse harm.", source: "Qur'an 49:12; Muslim 2589" },
  { id: "riya", name: "Riya' (Showing Off)", type: "Vice", description: "Performing worship for people to see — the 'lesser shirk'.", remedy: "Hide good deeds. Say: 'Allahumma inni a'udhu bika an ushrika bika...' (Ahmad 19606).", source: "Ahmad 23630" },
  { id: "hasty", name: "'Ajalah (Haste)", type: "Vice", description: "Rushing to speak, judge, or act without deliberation.", remedy: "'Deliberation is from Allah, haste from Shaytan.' Pause before responding.", source: "Tirmidhi 2012" },
  { id: "anger", name: "Ghadab (Anger)", type: "Vice", description: "Uncontrolled rage that blinds judgment.", remedy: "The Prophet ﷺ said 'Do not become angry.' Change position (stand→sit→lie). Say a'udhu billah. Make wudu.", source: "Bukhari 6116; Abu Dawud 4784" },
  { id: "miserly", name: "Bukhl (Miserliness)", type: "Vice", description: "Withholding what Allah has given.", remedy: "Give small sadaqah daily. 'The generous is close to Allah, close to Paradise…'", source: "Tirmidhi 1961" },
  { id: "long-hopes", name: "Tul al-Amal (Long Hopes)", type: "Vice", description: "Assuming a long life and delaying repentance and good works.", remedy: "Visit graves. Read Surah al-Takathur. Every night make wudu and pray witr as if it is your last.", source: "Bukhari 6416" },
];

const STORAGE_KEY = "akhlaq.read";

const Akhlaq = () => {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"All" | Trait["type"]>("All");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => TRAITS.filter(t => (type === "All" || t.type === type) && (!q.trim() || t.name.toLowerCase().includes(q.toLowerCase()) || t.description.toLowerCase().includes(q.toLowerCase()))), [q, type]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / TRAITS.length) * 100);
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Akhlaq — Islamic Character — Heartify" description="Virtues to cultivate and vices to avoid, with prophetic remedies for each." path="/akhlaq" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><Heart className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Akhlaq — Character</h1></div>
          <p className="mt-2 text-muted-foreground">"I was only sent to perfect noble character." — Al-Adab al-Mufrad 273</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Read</span><span className="text-sm text-muted-foreground">{readCount} / {TRAITS.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search traits…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{(["All","Virtue","Vice"] as const).map(t => <Button key={t} size="sm" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>{t}</Button>)}</div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(t => (
            <Card key={t.id} className={`p-5 cursor-pointer transition ${read[t.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...read, [t.id]: !read[t.id] })}>
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{t.name}</h2><Badge variant={t.type === "Virtue" ? "default" : "destructive"} className="mt-1">{t.type}</Badge></div>{read[t.id] && <Badge>Read</Badge>}</div>
              <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>
              <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Remedy / Practice</div><p className="text-sm">{t.remedy}</p></div>
              <p className="mt-2 text-xs text-muted-foreground italic">Source: {t.source}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Akhlaq;
