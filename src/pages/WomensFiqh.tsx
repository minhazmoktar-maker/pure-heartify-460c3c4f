import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Droplet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Ruling = { id: string; title: string; topic: "Hayd" | "Nifas" | "Istihadah" | "Purity" | "Salah" | "Fasting"; summary: string; details: string[]; source: string };

const RULINGS: Ruling[] = [
  { id: "hayd-def", topic: "Hayd", title: "What is Hayd?", summary: "Natural monthly blood, not the result of illness or childbirth.", details: ["Minimum duration (Hanafi): 3 days. Maximum: 10 days.", "Shafi'i: minimum 1 day/night, maximum 15 days.", "Blood is dark, thick, and has a specific odor.", "Purity period (tuhr) between two menses is at least 15 days."], source: "Qur'an 2:222; classical fiqh manuals" },
  { id: "hayd-forbidden", topic: "Hayd", title: "What is Forbidden During Hayd", summary: "Certain acts of worship and marital acts are paused.", details: ["Salah — not made up.", "Fasting — must be made up (qada).", "Tawaf around the Ka'bah.", "Reciting the Qur'an (differ among schools — reflection permitted).", "Touching the mushaf.", "Entering the masjid (majority).", "Sexual intercourse (Qur'an 2:222) — other affection allowed.", "Talaq is forbidden during hayd."], source: "Qur'an 2:222; Bukhari 305" },
  { id: "ghusl", topic: "Purity", title: "Ghusl After Hayd/Nifas", summary: "Ritual bath is obligatory when bleeding ends.", details: ["Intention (niyyah).", "Wash private area.", "Perform full wudu.", "Pour water over the head three times, working through the roots of the hair.", "Wash the entire body, right side then left."], source: "Bukhari 248" },
  { id: "nifas", topic: "Nifas", title: "Nifas (Postnatal Bleeding)", summary: "Blood following childbirth or miscarriage after 4 lunar months.", details: ["Maximum duration: 40 days (majority) — after which one performs ghusl and prays even if bleeding continues (treated as istihadah).", "Same restrictions as hayd apply.", "No 'iddah restriction on the marriage itself."], source: "Abu Dawud 311" },
  { id: "istihadah", topic: "Istihadah", title: "Istihadah (Irregular Bleeding)", summary: "Blood outside normal hayd/nifas from a vein or illness.", details: ["Perform wudu for each salah after the entry of the time.", "Use a pad; leakage after wudu does not invalidate salah.", "Pray, fast, and be intimate with the husband normally.", "Distinguish from hayd by habitual cycle length or by color/consistency."], source: "Bukhari 306; Muslim 333" },
  { id: "salah-hayd", topic: "Salah", title: "Missed Salah", summary: "Salah missed during hayd/nifas is NOT made up.", details: ["Aisha (RA): 'We were commanded to make up the fasts and not the prayers.' (Muslim 335)", "Resume normal salah after ghusl.", "If hayd begins after prayer time entered — that prayer must be made up when pure."], source: "Muslim 335" },
  { id: "fasting-hayd", topic: "Fasting", title: "Missed Fasts", summary: "Fasts missed in Ramadan MUST be made up.", details: ["Break the fast immediately when hayd starts.", "Make up day-for-day before next Ramadan.", "If unable due to continued illness/pregnancy — fidyah (feed a poor person per day) applies in some cases."], source: "Muslim 335" },
  { id: "quran-hayd", topic: "Hayd", title: "Qur'an During Hayd", summary: "Scholars differ; the safer path allows engagement without touching the mushaf.", details: ["Listening to recitation: allowed by all.", "Reciting from memory: many scholars (including Maliki, Ibn Taymiyyah) permit for teaching, du'a-verses, and dhikr.", "Touching mushaf: forbidden by the majority — use a barrier (gloves, phone screen with app)."], source: "Ibn Taymiyyah, Majmu' al-Fatawa" },
];

const STORAGE_KEY = "womensfiqh.read";

const WomensFiqh = () => {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<"All" | Ruling["topic"]>("All");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => RULINGS.filter(r => (topic === "All" || r.topic === topic) && (!q.trim() || r.title.toLowerCase().includes(q.toLowerCase()) || r.summary.toLowerCase().includes(q.toLowerCase()) || r.details.some(d => d.toLowerCase().includes(q.toLowerCase())))), [q, topic]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / RULINGS.length) * 100);
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Women's Fiqh — Heartify" description="Rulings on hayd, nifas, istihadah, purity, salah, and fasting for Muslim women." path="/womens-fiqh" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><Droplet className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Women's Fiqh</h1></div>
          <p className="mt-2 text-muted-foreground">Essential rulings on hayd, nifas, istihadah, and purity — with school differences noted.</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Read</span><span className="text-sm text-muted-foreground">{readCount} / {RULINGS.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search rulings…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{(["All","Hayd","Nifas","Istihadah","Purity","Salah","Fasting"] as const).map(t => <Button key={t} size="sm" variant={topic === t ? "default" : "outline"} onClick={() => setTopic(t)}>{t}</Button>)}</div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(r => (
            <Card key={r.id} className={`p-5 cursor-pointer transition ${read[r.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...read, [r.id]: !read[r.id] })}>
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{r.title}</h2><Badge variant="outline" className="mt-1">{r.topic}</Badge></div>{read[r.id] && <Badge>Read</Badge>}</div>
              <p className="mt-3 font-medium text-sm">{r.summary}</p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc pl-5">{r.details.map((d,i) => <li key={i}>{d}</li>)}</ul>
              <p className="mt-2 text-xs text-muted-foreground italic">Source: {r.source}</p>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground text-center">Educational summary — consult a qualified scholar for personal cases.</p>
      </div>
    </div>
  );
};
export default WomensFiqh;
