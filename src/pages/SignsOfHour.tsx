import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Sign = { id: string; name: string; category: "Minor" | "Major"; status: "Occurred" | "Occurring" | "Awaited"; description: string; source: string };

const SIGNS: Sign[] = [
  { id: "prophet-sent", name: "Sending of the Final Prophet ﷺ", category: "Minor", status: "Occurred", description: "The Prophet ﷺ said: 'I was sent, and the Hour, like these two' — joining his index and middle fingers.", source: "Bukhari 6503" },
  { id: "splitting-moon", name: "Splitting of the Moon", category: "Minor", status: "Occurred", description: "'The Hour has drawn near and the moon has split.' (Qur'an 54:1). Witnessed by the people of Makkah.", source: "Qur'an 54:1" },
  { id: "trusts-lost", name: "Loss of Trustworthiness", category: "Minor", status: "Occurring", description: "'When trust is lost, wait for the Hour.' Affairs given to unqualified people.", source: "Bukhari 59" },
  { id: "knowledge-lost", name: "Knowledge Removed, Ignorance Prevails", category: "Minor", status: "Occurring", description: "Allah takes knowledge by the death of scholars; ignorant leaders issue rulings without knowledge.", source: "Bukhari 100" },
  { id: "time-shortens", name: "Time Contracts", category: "Minor", status: "Occurring", description: "A year like a month, a month like a week — people feeling barakah has left time.", source: "Bukhari 989 (paraphrased)" },
  { id: "high-buildings", name: "Barefoot Shepherds Compete in Buildings", category: "Minor", status: "Occurring", description: "In Hadith Jibril: 'You will see the barefoot, naked, destitute shepherds competing in the construction of tall buildings.'", source: "Muslim 8" },
  { id: "women-many", name: "Ratio of Women to Men Increases", category: "Minor", status: "Occurring", description: "50 women to 1 man — through birth, war, and calamity.", source: "Bukhari 81" },
  { id: "killing", name: "Widespread Killing (al-Harj)", category: "Minor", status: "Occurring", description: "'The Hour will not be established until killing is widespread.' The killer will not know why he killed, nor the killed why he was killed.", source: "Muslim 2908" },
  { id: "earthquakes", name: "Frequent Earthquakes", category: "Minor", status: "Occurring", description: "'The Hour will not be established until earthquakes are frequent.'", source: "Bukhari 1036" },
  { id: "arabia-green", name: "Arabia Returns to Rivers & Meadows", category: "Minor", status: "Occurring", description: "'The Hour will not be established until the land of the Arabs returns to meadows and rivers.'", source: "Muslim 157" },
  { id: "mahdi", name: "Emergence of the Mahdi", category: "Major", status: "Awaited", description: "A rightly-guided leader from the family of the Prophet ﷺ who fills the earth with justice as it was filled with tyranny.", source: "Abu Dawud 4285" },
  { id: "dajjal", name: "Coming of the Dajjal", category: "Major", status: "Awaited", description: "The false messiah — one-eyed, right eye like a floating grape — greatest trial before the Hour. Every prophet warned against him.", source: "Bukhari 3439; Muslim 169" },
  { id: "isa", name: "Descent of 'Isa ibn Maryam ﷺ", category: "Major", status: "Awaited", description: "'Isa descends at the white minaret east of Damascus, kills the Dajjal, breaks the cross, kills the swine, and rules by the Shari'ah of Muhammad ﷺ.", source: "Muslim 155" },
  { id: "yajuj", name: "Emergence of Ya'juj and Ma'juj", category: "Major", status: "Awaited", description: "They break through the barrier and cause corruption on earth until 'Isa ﷺ prays against them and they perish.", source: "Muslim 2937; Qur'an 21:96" },
  { id: "three-sinkings", name: "Three Great Land-Sinkings", category: "Major", status: "Awaited", description: "One in the east, one in the west, and one in the Arabian Peninsula.", source: "Muslim 2901" },
  { id: "smoke", name: "The Smoke (Dukhan)", category: "Major", status: "Awaited", description: "A visible smoke that engulfs the earth, painful to disbelievers, like a common cold to believers.", source: "Muslim 2901; Qur'an 44:10" },
  { id: "sun-west", name: "Sunrise from the West", category: "Major", status: "Awaited", description: "After this, the door of tawbah closes and no new faith is accepted.", source: "Muslim 157" },
  { id: "beast", name: "Emergence of the Beast (Dabbah)", category: "Major", status: "Awaited", description: "A creature that speaks to people, marking believers and disbelievers on their faces.", source: "Muslim 2901; Qur'an 27:82" },
  { id: "fire-yemen", name: "Fire from Yemen", category: "Major", status: "Awaited", description: "A fire emerges from Yemen (or Aden) driving people to the place of gathering.", source: "Bukhari 7118" },
  { id: "trumpet", name: "The Blowing of the Trumpet", category: "Major", status: "Awaited", description: "Israfil blows the Trumpet — all life ends. Then a second blow — all are resurrected for the Day of Judgment.", source: "Qur'an 39:68" },
];

const STORAGE_KEY = "signs.read";

const SignsOfHour = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | Sign["category"]>("All");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => SIGNS.filter(s => (cat === "All" || s.category === cat) && (!q.trim() || s.name.toLowerCase().includes(q.toLowerCase()) || s.description.toLowerCase().includes(q.toLowerCase()))), [q, cat]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / SIGNS.length) * 100);
  const statusColor = (s: Sign["status"]) => s === "Occurred" ? "default" : s === "Occurring" ? "secondary" : "outline";
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Signs of the Day of Judgment — Heartify" description="Minor and major signs of the Hour from authentic hadith: the Mahdi, Dajjal, 'Isa, Ya'juj & Ma'juj, and more." path="/signs-of-hour" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><AlertCircle className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Signs of the Day of Judgment</h1></div>
          <p className="mt-2 text-muted-foreground">Minor signs (already occurring) and the major signs still awaited, from authentic hadith.</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Read</span><span className="text-sm text-muted-foreground">{readCount} / {SIGNS.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search signs…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{(["All","Minor","Major"] as const).map(c => <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>)}</div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(s => (
            <Card key={s.id} className={`p-5 cursor-pointer transition ${read[s.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...read, [s.id]: !read[s.id] })}>
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{s.name}</h2><div className="mt-1 flex flex-wrap gap-2"><Badge variant="outline">{s.category}</Badge><Badge variant={statusColor(s.status) as any}>{s.status}</Badge></div></div>{read[s.id] && <Badge>Read</Badge>}</div>
              <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>
              <p className="mt-2 text-xs text-muted-foreground italic">Source: {s.source}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default SignsOfHour;
