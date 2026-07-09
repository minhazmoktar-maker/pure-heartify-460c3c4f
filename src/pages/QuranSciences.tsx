import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

type Topic = { id: string; term: string; arabic: string; summary: string; detail: string };

const TOPICS: Topic[] = [
  { id: "wahy", term: "Waḥy — Revelation", arabic: "الوحي", summary: "The methods by which Allah revealed the Qur'an to Muḥammad ﷺ.", detail: "True dreams, casting in the heart, the Angel appearing as a man, or the bell-like sound — the hardest form. See Bukhari 2." },
  { id: "makki-madani", term: "Makkī & Madanī", arabic: "المكي والمدني", summary: "Classification of revelation by pre- and post-Hijrah.", detail: "Makkī sūrahs emphasise 'aqīdah and stories of past nations; Madanī sūrahs establish law, jihād, and community." },
  { id: "asbab", term: "Asbāb al-Nuzūl", arabic: "أسباب النزول", summary: "The occasions/circumstances of revelation.", detail: "Understanding why an ayah was revealed clarifies its intent. Foundational works include al-Wāḥidī's Asbāb al-Nuzūl." },
  { id: "naskh", term: "Nāsikh & Mansūkh", arabic: "الناسخ والمنسوخ", summary: "Abrogating and abrogated verses.", detail: "Categories: recitation abrogated but ruling remains, ruling abrogated but recitation remains, or both abrogated." },
  { id: "muhkam", term: "Muḥkam & Mutashābih", arabic: "المحكم والمتشابه", summary: "Clear vs. allegorical verses.", detail: "The muḥkam are the foundation; the mutashābih are believed in as they came, without distortion (Qur'an 3:7)." },
  { id: "qiraat", term: "Al-Qirā'āt al-Sab'", arabic: "القراءات السبع", summary: "The seven canonical modes of recitation.", detail: "All authentically transmitted from the Prophet ﷺ. Ḥafṣ 'an 'Āṣim is the most widespread today." },
  { id: "tafsir", term: "Uṣūl al-Tafsīr", arabic: "أصول التفسير", summary: "Principles of Qur'anic exegesis.", detail: "Order: Qur'an by Qur'an → Qur'an by Sunnah → statements of the Ṣaḥābah → Tābi'īn → the Arabic language." },
  { id: "ijaz", term: "I'jāz al-Qur'ān", arabic: "إعجاز القرآن", summary: "The inimitability of the Qur'an.", detail: "Linguistic, legislative, scientific, and prophetic dimensions — the standing miracle of Islam (Qur'an 17:88)." },
];

const KEY = "quran-sciences.done";

const QuranSciences = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [q, setQ] = useState("");
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;
  const filtered = TOPICS.filter(t => (t.term + t.summary + t.detail).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ulum al-Qur'an — Sciences of the Qur'an" description="Introduction to the classical sciences of the Qur'an: revelation, Makki/Madani, abrogation, exegesis, qira'at, and i'jaz." path="/quran-sciences" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><BookOpen className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Sciences of the Qur'an</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Studied</span><span className="text-sm font-medium">{count} / {TOPICS.length}</span></div><Progress value={(count / TOPICS.length) * 100} /></Card>
        <div className="flex gap-2"><Input placeholder="Search topics…" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        {filtered.map(t => (
          <Card key={t.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [t.id]: !done[t.id] })}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="font-semibold text-lg">{t.term}</h2>
              {done[t.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <div className="text-xl text-right font-arabic mb-2 text-muted-foreground">{t.arabic}</div>
            <p className="text-sm mb-1">{t.summary}</p>
            <p className="text-sm text-muted-foreground">{t.detail}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuranSciences;
