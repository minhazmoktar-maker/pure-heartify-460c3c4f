import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

type Term = { id: string; term: string; arabic: string; definition: string; example: string };

const TERMS: Term[] = [
  { id: "sahih", term: "Ṣaḥīḥ", arabic: "صحيح", definition: "A hadith with a connected chain of upright, precise narrators, free of shudhūdh and 'illah.", example: "The bulk of Bukhari and Muslim." },
  { id: "hasan", term: "Ḥasan", arabic: "حسن", definition: "Meets ṣaḥīḥ conditions but with slightly lesser precision (ḍabṭ) in a narrator.", example: "Many hadiths graded ḥasan by al-Tirmidhī." },
  { id: "daif", term: "Ḍa'īf", arabic: "ضعيف", definition: "Missing one or more conditions of authenticity; not used to establish rulings alone.", example: "Broken chain (munqaṭi'), unknown narrator (majhūl), etc." },
  { id: "mawdu", term: "Mawḍū'", arabic: "موضوع", definition: "Fabricated — falsely attributed to the Prophet ﷺ. Forbidden to narrate as hadith except to warn.", example: "Compiled by Ibn al-Jawzī in al-Mawḍū'āt." },
  { id: "mutawatir", term: "Mutawātir", arabic: "متواتر", definition: "Narrated by so many at every level that collusion on a lie is impossible — yields certain knowledge.", example: "'Whoever lies upon me deliberately, let him take his seat in the Fire.'" },
  { id: "ahad", term: "Āḥād", arabic: "آحاد", definition: "Reports not reaching the level of tawātur. Sub-divided into mashhūr, 'azīz, and gharīb.", example: "Most narrations in the Six Books." },
  { id: "marfu", term: "Marfū'", arabic: "مرفوع", definition: "Attributed to the Prophet ﷺ himself (statement, action, or tacit approval).", example: "'Actions are but by intentions.'" },
  { id: "mawquf", term: "Mawqūf", arabic: "موقوف", definition: "A statement or action attributed only to a Companion.", example: "Athār of 'Umar, Ibn 'Abbās, etc." },
  { id: "isnad", term: "Isnād", arabic: "الإسناد", definition: "The chain of transmission — 'the isnād is part of the religion' (Ibn al-Mubārak).", example: "Fulān from Fulān from the Prophet ﷺ." },
  { id: "jarh", term: "Al-Jarḥ wa'l-Ta'dīl", arabic: "الجرح والتعديل", definition: "The science of critiquing and validating narrators.", example: "Works of Ibn Ḥajar's Tahdhīb al-Tahdhīb." },
];

const KEY = "hadith-sciences.done";

const HadithSciences = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [q, setQ] = useState("");
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;
  const filtered = TERMS.filter(t => (t.term + t.definition + t.example).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Mustalah al-Hadith — Sciences of Hadith Terminology" description="Core terms and categories of hadith criticism: sahih, hasan, da'if, mawdu, mutawatir, ahad, marfu', mawquf, isnad, and jarh wa ta'dil." path="/hadith-sciences" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><ScrollText className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Sciences of Hadith</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Learned</span><span className="text-sm font-medium">{count} / {TERMS.length}</span></div><Progress value={(count / TERMS.length) * 100} /></Card>
        <div className="flex gap-2"><Input placeholder="Search terms…" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        {filtered.map(t => (
          <Card key={t.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [t.id]: !done[t.id] })}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="font-semibold text-heading">{t.term} <span className="text-muted-foreground font-arabic">— {t.arabic}</span></h2>
              {done[t.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <p className="text-sm mb-1">{t.definition}</p>
            <p className="text-sm text-muted-foreground italic">e.g. {t.example}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HadithSciences;
