import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Step = { id: string; title: string; where: string; points: string[]; dua?: string; source: string };

const STEPS: Step[] = [
  { id: "ihram", title: "1. Ihram", where: "Miqat (before entering Haram)", points: ["Ghusl, perfume the body (not the ihram cloth), wear the two-piece white ihram (men).", "Pray two rak'ahs (tahiyyat al-wudu).", "Make intention aloud: 'Labbayka Allahumma umrah'.", "Enter the state of ihram — begin restrictions (no cutting hair/nails, no perfume, no marital relations, no hunting)."], dua: "Labbayk Allahumma labbayk, labbayka la sharika laka labbayk, inna al-hamda wan-ni'mata laka wal-mulk, la sharika lak.", source: "Bukhari 1549; Muslim 1184" },
  { id: "talbiyah", title: "2. Talbiyah on the Journey", where: "From miqat to Makkah", points: ["Recite the Talbiyah loudly and often throughout the journey.", "Men raise voices; women recite softly.", "Stop upon beginning tawaf."], source: "Muslim 1184" },
  { id: "enter-haram", title: "3. Entering Masjid al-Haram", where: "At the door", points: ["Enter with the right foot: 'Bismillah, Allahumma iftah li abwaba rahmatik'.", "Approach the Ka'bah with humility and awe."], source: "Muslim 713" },
  { id: "tawaf", title: "4. Tawaf al-Umrah", where: "Around the Ka'bah", points: ["Stop the Talbiyah. Ka'bah on your left.", "Begin at the Black Stone corner: 'Bismillah, Allahu Akbar' — point/kiss if possible.", "Seven complete circuits.", "Men: uncover the right shoulder (idtiba') and jog in the first three rounds (raml).", "Between the Yemeni Corner and Black Stone recite: 'Rabbana atina fid-dunya hasanah…' (2:201)."], source: "Bukhari 1602; Muslim 1218" },
  { id: "maqam", title: "5. Two Rak'ahs at Maqam Ibrahim", where: "Behind Maqam Ibrahim", points: ["Pray two short rak'ahs behind (or anywhere in the Haram if crowded).", "Rak'ah 1: Fatihah + Al-Kafirun. Rak'ah 2: Fatihah + Al-Ikhlas."], source: "Muslim 1218" },
  { id: "zamzam", title: "6. Drink Zamzam", where: "Zamzam dispensers", points: ["Drink facing qiblah, standing, in three breaths.", "Make du'a — 'The water of Zamzam is for whatever it is drunk for'.", "Pour a little on the head if desired."], source: "Ibn Majah 3062" },
  { id: "safa", title: "7. Sa'i — from Safa to Marwah", where: "Between Safa and Marwah", points: ["Climb Safa, face the Ka'bah, raise hands, and say Takbir + tahlil three times.", "Walk to Marwah — men jog between the green markers.", "Complete seven trips (Safa→Marwah = 1, Marwah→Safa = 2, etc.).", "End on Marwah with du'a."], source: "Muslim 1218" },
  { id: "halq", title: "8. Halq or Taqsir", where: "Anywhere after sa'i", points: ["Men: shave the head (halq — preferred) or trim evenly (taqsir).", "Women: gather hair and trim a fingertip length from the ends.", "This releases you from ihram — Umrah is complete!"], source: "Bukhari 1727" },
];

const STORAGE_KEY = "umrah.done";

const UmrahGuide = () => {
  const [q, setQ] = useState("");
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => STEPS.filter(s => !q.trim() || s.title.toLowerCase().includes(q.toLowerCase()) || s.points.some(p => p.toLowerCase().includes(q.toLowerCase()))), [q]);
  const doneCount = Object.values(done).filter(Boolean).length;
  const pct = Math.round((doneCount / STEPS.length) * 100);
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Umrah Step-by-Step Guide — Heartify" description="Complete Umrah walkthrough: ihram, talbiyah, tawaf, sa'i, and halq — with du'as and sources." path="/umrah" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><MapPin className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Umrah Step-by-Step</h1></div>
          <p className="mt-2 text-muted-foreground">Follow along and tap each step as you complete it, insha'Allah.</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Progress</span><span className="text-sm text-muted-foreground">{doneCount} / {STEPS.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search steps…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(s => (
            <Card key={s.id} className={`p-5 cursor-pointer transition ${done[s.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...done, [s.id]: !done[s.id] })}>
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{s.title}</h2><Badge variant="outline" className="mt-1">{s.where}</Badge></div>{done[s.id] && <Badge>Done</Badge>}</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">{s.points.map((p,i) => <li key={i}>{p}</li>)}</ul>
              {s.dua && <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"><div className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Du'a</div>{s.dua}</div>}
              <p className="mt-2 text-xs text-muted-foreground italic">Source: {s.source}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default UmrahGuide;
