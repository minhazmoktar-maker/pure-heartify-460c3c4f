import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Flower } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Step = { id: string; title: string; phase: "Dying" | "After Death" | "Ghusl" | "Kafan" | "Salah" | "Burial" | "After Burial"; points: string[]; source: string };

const STEPS: Step[] = [
  { id: "talqin", title: "Talqin — Prompting the Shahadah", phase: "Dying", points: ["Prompt the dying person gently: 'La ilaha illa Allah'.", "Do not command; simply say it near them so they repeat.", "Turn them to face the qiblah if possible.", "Recite Surah Ya-Sin nearby."], source: "Muslim 916; Abu Dawud 3121" },
  { id: "closing", title: "Immediately After Death", phase: "After Death", points: ["Close the eyes and make du'a: 'Allahumma-ghfir li… wa arfa' darajatahu…'", "Tie the jaw so the mouth stays closed.", "Cover the body with a clean sheet.", "Hasten the funeral — burial the same day if possible."], source: "Muslim 920; Bukhari 1315" },
  { id: "debts", title: "Settle Debts and Wasiyyah", phase: "After Death", points: ["Debts must be paid before inheritance is distributed.", "Execute up to 1/3 of the estate as bequest (wasiyyah) to non-heirs.", "Remaining follows Qur'anic shares (see Inheritance Calculator)."], source: "Qur'an 4:11–12" },
  { id: "ghusl", title: "Ghusl al-Mayyit", phase: "Ghusl", points: ["Washer should be of the same gender (spouses may wash each other).", "Wash odd number of times (3, 5, 7) with water and sidr/soap.", "Start with the right side, then left; wudu-parts first.", "Add camphor to the final wash. Dry the body."], source: "Bukhari 1253; Muslim 939" },
  { id: "kafan", title: "Kafan (Shrouding)", phase: "Kafan", points: ["Men: three plain white sheets. Women: five pieces (izar, khimar, qamis, and two lifafas).", "Perfume the shrouds; place camphor on the sujud points.", "Simple, white cloth is sunnah — no extravagance."], source: "Bukhari 1264" },
  { id: "salah-janazah", title: "Salatul Janazah", phase: "Salah", points: ["Standing prayer with 4 takbirs, no ruku' or sujud.", "After 1st takbir: Al-Fatihah.", "After 2nd: Salawat on the Prophet ﷺ.", "After 3rd: du'a for the deceased ('Allahumma-ghfir li hayyina…').", "After 4th: brief du'a, then one taslim."], source: "Muslim 963; Abu Dawud 3199" },
  { id: "burial", title: "Burial", phase: "Burial", points: ["Carry the janazah briskly (not running).", "Lower into the grave from the qiblah side, saying: 'Bismillah wa 'ala millati rasulillah'.", "Lay on the right side facing the qiblah.", "Each attendee throws three handfuls of soil."], source: "Abu Dawud 3211; Ibn Majah 1553" },
  { id: "condolence", title: "Ta'ziyah (Condolence)", phase: "After Burial", points: ["Offer condolences within three days, no specific gathering required.", "Say: 'Inna lillahi ma akhadh, wa lahu ma a'ta, wa kullu shay'in indahu bi ajalin musamma.'", "Neighbors and relatives should prepare food for the bereaved family."], source: "Bukhari 1284; Abu Dawud 3132" },
  { id: "avoid", title: "Avoid Bid'ah in Mourning", phase: "After Burial", points: ["No wailing, tearing clothes, striking cheeks — the Prophet ﷺ disowned this.", "No fixed 3rd, 7th, 40th day gatherings with food from the family.", "Widow observes 'iddah of 4 months and 10 days (avoiding adornment, not leaving the home unnecessarily)."], source: "Bukhari 1294; Qur'an 2:234" },
  { id: "sadaqah-jariyah", title: "Sadaqah Jariyah for the Deceased", phase: "After Burial", points: ["Continuous charity, beneficial knowledge, or a righteous child's du'a reach them.", "Fulfill their unfulfilled hajj, fasts, and vows.", "Give sadaqah on their behalf and make du'a often."], source: "Muslim 1631" },
];

const STORAGE_KEY = "janazah.read";

const Janazah = () => {
  const [q, setQ] = useState("");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => STEPS.filter(s => !q.trim() || s.title.toLowerCase().includes(q.toLowerCase()) || s.points.some(p => p.toLowerCase().includes(q.toLowerCase()))), [q]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / STEPS.length) * 100);
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Janazah Guide — Heartify" description="Prophetic steps from the deathbed through ghusl, kafan, salatul janazah, burial, and ta'ziyah." path="/janazah" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><Flower className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Janazah — Death & Burial Guide</h1></div>
          <p className="mt-2 text-muted-foreground">"Every soul shall taste death." (Qur'an 3:185) A prophetic walkthrough from the deathbed to ta'ziyah.</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Read</span><span className="text-sm text-muted-foreground">{readCount} / {STEPS.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search steps…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(s => (
            <Card key={s.id} className={`p-5 cursor-pointer transition ${read[s.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...read, [s.id]: !read[s.id] })}>
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{s.title}</h2><Badge variant="outline" className="mt-1">{s.phase}</Badge></div>{read[s.id] && <Badge>Read</Badge>}</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">{s.points.map((p,i) => <li key={i}>{p}</li>)}</ul>
              <p className="mt-2 text-xs text-muted-foreground italic">Source: {s.source}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Janazah;
