import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Baby } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Stage = {
  id: string;
  title: string;
  age: string;
  focus: string;
  practices: string[];
  source: string;
};

const STAGES: Stage[] = [
  { id: "newborn", title: "Newborn Sunnahs", age: "0–7 days", focus: "Welcoming the child into the ummah.", practices: ["Adhan in the right ear, iqamah in the left at birth.", "Tahnik: soften a date and rub a little on the palate.", "Aqiqah on day 7: two sheep for a boy, one for a girl.", "Shave the head on day 7, weigh the hair, give its weight in silver as sadaqah.", "Give a beautiful, meaningful name — best names are Abdullah and Abdur-Rahman."], source: "Abu Dawud 5105; Tirmidhi 1522" },
  { id: "infant", title: "Infant Years", age: "0–2 years", focus: "Breastfeeding, bonding, mercy.", practices: ["Full breastfeeding for two lunar years is recommended (Qur'an 2:233).", "Show constant affection — the Prophet ﷺ kissed and carried children in prayer.", "Never curse or invoke against your child.", "Make du'a for their protection: 'A'idhukuma bi kalimatillahit-tammah…'"], source: "Qur'an 2:233; Bukhari 5998" },
  { id: "early", title: "Early Childhood", age: "2–6 years", focus: "Play, love, gentle habits.", practices: ["Play with them at their level; the Prophet ﷺ let Hasan and Husayn climb on his back in sujud.", "Teach 'Bismillah', 'Alhamdulillah', and greeting with salam.", "Model, don't lecture — children mimic what they see.", "Read them stories of the Prophets."], source: "Nasa'i 1141; Bukhari" },
  { id: "salah-age", title: "Teaching Salah", age: "7 years", focus: "Beginning the pillar.", practices: ["Command them to pray at age 7.", "Teach wudu and the words of salah with patience.", "Pray beside them; let them see you praying at home.", "Do not shame — encourage."], source: "Abu Dawud 495" },
  { id: "correction", title: "Correction & Discipline", age: "10 years", focus: "Firm but merciful.", practices: ["From age 10, discipline for missing salah — never harshly, never on the face, never leaving a mark.", "Separate their sleeping arrangements from that age.", "Discipline is a last resort after teaching, modeling, and reminding."], source: "Abu Dawud 495" },
  { id: "quran-child", title: "Qur'an with Children", age: "5+ years", focus: "The Qur'an in the heart before the world enters it.", practices: ["Start with short surahs (Fatihah, last 10 of Juz 'Amma).", "Daily, short, joyful sessions — never associate the Qur'an with punishment.", "Reward memorization with love and small gifts.", "Enroll in a trusted hifz program if possible."], source: "Prophetic pedagogy" },
  { id: "adolescence", title: "Adolescence", age: "12–18 years", focus: "Companionship over control.", practices: ["Move from parenting down to walking beside — become their friend.", "Guard the company they keep; the Prophet ﷺ said a person follows the religion of their friend.", "Talk about puberty, purification (ghusl), and hijab/gaze early and openly.", "Involve them in family shura (consultation)."], source: "Abu Dawud 4833" },
  { id: "identity", title: "Islamic Identity", age: "All ages", focus: "Being Muslim in a non-Muslim world.", practices: ["Celebrate the two Eids with joy and gifts to root them in Islamic culture.", "Give them Islamic history heroes — Sahaba, scholars, mujahideen of the pen.", "Visit the masjid regularly so it feels like home.", "Limit media that contradicts Islamic values; provide halal alternatives."], source: "Contemporary tarbiyah" },
  { id: "justice", title: "Justice Between Children", age: "All ages", focus: "Equal love, equal gifts.", practices: ["Do not favor one child in gifts, attention, or praise.", "'Fear Allah and be just among your children.' (Bukhari 2587)", "Public praise of one without the others breeds envy."], source: "Bukhari 2587; Muslim 1623" },
  { id: "dua", title: "Du'a for Children", age: "Before conception onwards", focus: "The parent's du'a is answered.", practices: ["'Rabbi hab li min-as-salihin' — grant me a righteous child (37:100).", "'Rabbi ja'alni muqim as-salati wa min dhurriyyati' (14:40).", "Never make du'a against your child in anger — it may be accepted.", "Du'a of the parent for/against the child is not rejected."], source: "Qur'an 37:100, 14:40; Tirmidhi 1905" },
];

const STORAGE_KEY = "parenting.read";

const Parenting = () => {
  const [query, setQuery] = useState("");
  const [read, setRead] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const toggle = (id: string) => persist({ ...read, [id]: !read[id] });
  const reset = () => persist({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STAGES;
    return STAGES.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.focus.toLowerCase().includes(q) ||
      s.age.toLowerCase().includes(q) ||
      s.practices.some(p => p.toLowerCase().includes(q))
    );
  }, [query]);

  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / STAGES.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Islamic Parenting Guide — Heartify"
        description="Prophetic tarbiyah from newborn sunnahs through adolescence: milestones, practices, and du'as."
        path="/parenting"
      />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Baby className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Islamic Parenting (Tarbiyah)</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            "Each of you is a shepherd, and each of you is responsible for his flock." — Bukhari 893. A stage-by-stage prophetic guide.
          </p>
        </header>

        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-medium">Read</span>
            <span className="text-sm text-muted-foreground">{readCount} / {STAGES.length}</span>
          </div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search stages or practices…" className="pl-9" />
            </div>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        <div className="grid gap-4">
          {filtered.map(s => (
            <Card
              key={s.id}
              className={`p-5 cursor-pointer transition ${read[s.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`}
              onClick={() => toggle(s.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold">{s.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="secondary">{s.age}</Badge>
                  </div>
                </div>
                {read[s.id] && <Badge className="shrink-0">Read</Badge>}
              </div>
              <p className="mt-3 font-medium text-sm">{s.focus}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                {s.practices.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground italic">Source: {s.source}</p>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">No stages match your search.</Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Parenting;
