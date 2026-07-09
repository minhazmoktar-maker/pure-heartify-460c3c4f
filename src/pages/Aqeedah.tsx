import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Article = { id: string; title: string; pillar: string; summary: string; details: string[]; source: string };

const ARTICLES: Article[] = [
  { id: "allah", title: "Belief in Allah", pillar: "1st Pillar", summary: "Belief in His Lordship (rububiyyah), worship due to Him alone (uluhiyyah), and His Names and Attributes (asma wa sifat).", details: ["Tawhid ar-Rububiyyah: He alone creates, sustains, and controls.", "Tawhid al-Uluhiyyah: He alone deserves worship — the essence of 'La ilaha illa Allah'.", "Tawhid al-Asma wa's-Sifat: Affirm His names and attributes as in Qur'an/Sunnah without tashbih (likening) or ta'til (denial).", "Opposite: shirk — the only sin Allah does not forgive if one dies upon it."], source: "Qur'an 112; 42:11" },
  { id: "angels", title: "Belief in the Angels", pillar: "2nd Pillar", summary: "Created from light, sinless, tasked with specific duties.", details: ["Jibril — revelation.", "Mika'il — provision and rain.", "Israfil — the Trumpet.", "Malik — Hellfire.", "Ridwan — Paradise.", "Munkar & Nakir — questioning in the grave.", "The Kiram al-Katibin — recording deeds."], source: "Qur'an 2:98, 66:6" },
  { id: "books", title: "Belief in the Books", pillar: "3rd Pillar", summary: "Divine revelations sent to guide humanity.", details: ["Suhuf (scrolls) of Ibrahim and Musa.", "Tawrat of Musa.", "Zabur of Dawud.", "Injil of Isa.", "The Qur'an — final revelation, preserved by Allah (15:9).", "Previous scriptures were altered; the Qur'an is the ultimate criterion."], source: "Qur'an 15:9, 5:48" },
  { id: "messengers", title: "Belief in the Messengers", pillar: "4th Pillar", summary: "Human beings chosen by Allah, sinless in message delivery.", details: ["25 named in the Qur'an; every nation had a warner (35:24).", "Ulu al-'Azm: Nuh, Ibrahim, Musa, Isa, Muhammad ﷺ.", "Muhammad ﷺ is the Seal — no prophet after him.", "Believe in all; disbelief in one is disbelief in all."], source: "Qur'an 33:40, 2:285" },
  { id: "last-day", title: "Belief in the Last Day", pillar: "5th Pillar", summary: "Death, grave, resurrection, gathering, reckoning, sirat, Paradise or Hell.", details: ["Trial of the grave — pleasant or torment.", "Blowing of the Trumpet — all creation perishes, then resurrected.", "Weighing of deeds and scrolls.", "Sirat — bridge over Hell.", "Paradise for believers, eternal Hell for disbelievers, purification for sinful believers."], source: "Qur'an 39:68, 99:6–8" },
  { id: "qadar", title: "Belief in Qadar", pillar: "6th Pillar", summary: "Divine decree — the good and bad of it — is from Allah.", details: ["Allah knew all things eternally.", "He wrote them in the Preserved Tablet 50,000 years before creation.", "His will encompasses all — nothing occurs except by it.", "He created all events, actions, and choices.", "Yet humans have real (but not absolute) will and are accountable."], source: "Muslim 8; Qur'an 54:49" },
  { id: "tawhid-types", title: "Categories of Tawhid", pillar: "Core", summary: "Understanding Tawhid preserves faith from shirk.", details: ["Rububiyyah — Lordship.", "Uluhiyyah — Worship.", "Asma wa Sifat — Names & Attributes.", "The mushrikun of Makkah affirmed Rububiyyah but violated Uluhiyyah."], source: "Ibn Taymiyyah, Aqeedah Wasitiyyah" },
  { id: "shirk", title: "Shirk — Major & Minor", pillar: "Warning", summary: "Associating partners with Allah — the greatest sin.", details: ["Major (akbar) — worship, du'a, sacrifice, or reliance directed to other than Allah.", "Minor (asghar) — riya' (showing off), swearing by other than Allah.", "Hidden — subtle desire for praise in worship.", "Repent immediately and often."], source: "Qur'an 4:48, 4:116" },
  { id: "iman-branches", title: "Iman: Statement, Belief, Action", pillar: "Essential", summary: "Iman is not merely words — it includes conviction and works.", details: ["Iman consists of over 70 branches (Muslim 35).", "Highest: 'La ilaha illa Allah'. Lowest: removing harm from the path.", "It increases with obedience and decreases with sin.", "Deeds are part of iman by consensus of Ahl al-Sunnah."], source: "Muslim 35" },
];

const STORAGE_KEY = "aqeedah.read";

const Aqeedah = () => {
  const [q, setQ] = useState("");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => ARTICLES.filter(a => !q.trim() || a.title.toLowerCase().includes(q.toLowerCase()) || a.details.some(d => d.toLowerCase().includes(q.toLowerCase()))), [q]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / ARTICLES.length) * 100);
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Aqeedah — Islamic Creed — Heartify" description="The six pillars of iman: Allah, Angels, Books, Messengers, Last Day, Qadar. Categories of Tawhid, shirk, and iman." path="/aqeedah" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Aqeedah — Islamic Creed</h1></div>
          <p className="mt-2 text-muted-foreground">The six pillars of iman and the essentials of tawhid.</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Read</span><span className="text-sm text-muted-foreground">{readCount} / {ARTICLES.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search creed…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(a => (
            <Card key={a.id} className={`p-5 cursor-pointer transition ${read[a.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...read, [a.id]: !read[a.id] })}>
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{a.title}</h2><Badge variant="outline" className="mt-1">{a.pillar}</Badge></div>{read[a.id] && <Badge>Read</Badge>}</div>
              <p className="mt-3 font-medium text-sm">{a.summary}</p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc pl-5">{a.details.map((d,i) => <li key={i}>{d}</li>)}</ul>
              <p className="mt-2 text-xs text-muted-foreground italic">Source: {a.source}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Aqeedah;
