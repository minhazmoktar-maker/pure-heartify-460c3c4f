import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Swords, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

type Battle = { id: string; name: string; year: string; place: string; outcome: string; summary: string; lesson: string };

const BATTLES: Battle[] = [
  { id: "badr", name: "Battle of Badr", year: "2 AH / 624 CE", place: "Badr wells", outcome: "Decisive Muslim victory (313 vs ~1,000)", summary: "The first major battle. Angels descended to aid the believers (Qur'an 3:123-125). Key Quraysh leaders killed.", lesson: "Victory is from Allah alone — not from numbers." },
  { id: "uhud", name: "Battle of Uhud", year: "3 AH / 625 CE", place: "Mount Uhud, Madinah", outcome: "Setback due to archers leaving posts", summary: "The Prophet ﷺ was wounded and Ḥamzah رضي الله عنه was martyred. A test to distinguish the sincere from hypocrites.", lesson: "Discipline and obedience to command are decisive." },
  { id: "khandaq", name: "Battle of the Trench (al-Aḥzāb)", year: "5 AH / 627 CE", place: "Madinah", outcome: "Confederates dispersed by wind and cold", summary: "Salmān al-Fārisī's advice to dig a trench. A siege of 10,000 broken without a major battle (Qur'an 33:9).", lesson: "Consultation (shūrā) and creative planning." },
  { id: "khaybar", name: "Conquest of Khaybar", year: "7 AH / 628 CE", place: "Khaybar oasis", outcome: "Fortresses fell to the Muslims", summary: "'Alī رضي الله عنه opened the fortress of Qamūṣ. Ended hostile Jewish-tribal power in the Hijāz.", lesson: "'I will give the banner tomorrow to a man who loves Allah and His Messenger.'" },
  { id: "mutah", name: "Battle of Mu'tah", year: "8 AH / 629 CE", place: "Mu'tah, Jordan", outcome: "Tactical withdrawal by Khālid ibn al-Walīd", summary: "3,000 Muslims faced 100,000+ Byzantine and Ghassanid forces. Three commanders martyred in succession.", lesson: "Sound retreat can be victory." },
  { id: "fath", name: "Conquest of Makkah (Fatḥ)", year: "8 AH / 630 CE", place: "Makkah", outcome: "Bloodless conquest; general amnesty", summary: "10,000 Muslims entered Makkah. The Prophet ﷺ pardoned the Quraysh: 'Go, for you are free.' 360 idols were destroyed.", lesson: "Mercy at the point of power." },
  { id: "hunayn", name: "Battle of Ḥunayn", year: "8 AH / 630 CE", place: "Valley of Ḥunayn", outcome: "Victory after early disarray (Qur'an 9:25-26)", summary: "Initial rout by Hawāzin archers reversed by the Prophet's ﷺ steadfastness with his core companions.", lesson: "Do not be deluded by numbers." },
  { id: "tabuk", name: "Expedition of Tabūk", year: "9 AH / 630 CE", place: "Tabūk (northern Arabia)", outcome: "No battle — Byzantines withdrew", summary: "The 'expedition of hardship' in blazing heat and drought. The three who stayed behind and were forgiven (Qur'an 9:118).", lesson: "Repentance restores what disobedience destroys." },
];

const KEY = "battles.done";

const Battles = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [q, setQ] = useState("");
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;
  const filtered = BATTLES.filter(b => (b.name + b.summary + b.lesson + b.place).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Battles & Expeditions of the Prophet ﷺ — Ghazawāt" description="The major battles of the Prophet Muḥammad ﷺ — Badr, Uhud, Khandaq, Khaybar, Mu'tah, Fatḥ Makkah, Ḥunayn, Tabūk — from authentic sīrah." path="/battles" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Swords className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Ghazawāt — Battles of the Prophet ﷺ</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Studied</span><span className="text-sm font-medium">{count} / {BATTLES.length}</span></div><Progress value={(count / BATTLES.length) * 100} /></Card>
        <div className="flex gap-2"><Input placeholder="Search battles…" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        {filtered.map(b => (
          <Card key={b.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [b.id]: !done[b.id] })}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div><h2 className="font-semibold text-lg">{b.name}</h2><p className="text-xs text-muted-foreground">{b.year} · {b.place}</p></div>
              {done[b.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <Badge variant="secondary" className="mb-2">{b.outcome}</Badge>
            <p className="text-sm mb-2">{b.summary}</p>
            <p className="text-sm italic border-l-2 border-primary pl-3"><span className="font-medium">Lesson:</span> {b.lesson}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Battles;
