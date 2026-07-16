import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

type M = { id: string; title: string; summary: string; reference: string };

const MIRACLES: M[] = [
  { id: "quran", title: "The Qur'an — the greatest and standing miracle", summary: "An inimitable book in language, law, prophecy, and knowledge — preserved unchanged for 1,400 years.", reference: "Qur'an 17:88; 15:9" },
  { id: "isra", title: "Al-Isrā' wa'l-Mi'rāj", summary: "The night journey from Makkah to Bayt al-Maqdis, then ascension through the heavens where Salāh was ordained.", reference: "Qur'an 17:1; Bukhari 3887" },
  { id: "moon", title: "Splitting of the moon (Inshiqāq al-Qamar)", summary: "The moon split into two visible halves at Mount Ṣafā in response to Quraysh's challenge.", reference: "Qur'an 54:1-2; Bukhari 3636" },
  { id: "water", title: "Water gushing from his fingers", summary: "At Ḥudaybiyyah and other occasions, water flowed from between his blessed fingers, watering hundreds and their animals.", reference: "Bukhari 3576" },
  { id: "food", title: "Food multiplied", summary: "Small portions fed large gatherings — as at the Trench when Jābir's little food fed a thousand.", reference: "Bukhari 4102" },
  { id: "tree", title: "The weeping palm-trunk (Ḥannānah)", summary: "A tree trunk used as his pulpit wept audibly like a child when he moved to a new minbar, until he embraced it and it calmed.", reference: "Bukhari 3585" },
  { id: "healing", title: "Healing the eye of Qatādah & 'Alī at Khaybar", summary: "He restored Qatādah's dislodged eye better than before and cured 'Alī's ophthalmia with his saliva and du'ā'.", reference: "Al-Bidayah wa'n-Nihayah" },
  { id: "prophecy", title: "Prophecies fulfilled", summary: "Byzantine victory over Persia within 3–9 years (Qur'an 30:2-4); conquest of Persia and Rome; martyrdom of 'Umar, 'Uthmān, 'Alī, and Ḥusayn — all fulfilled precisely.", reference: "Qur'an 30; Bukhari & Muslim" },
];

const KEY = "miracles.done";

const Miracles = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [q, setQ] = useState("");
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;
  const filtered = MIRACLES.filter(m => (m.title + m.summary).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Miracles of the Prophet Muḥammad ﷺ — Mu'jizāt" description="Authentic miracles of the Prophet ﷺ: the Qur'an, Isrā' wa'l-Mi'rāj, splitting of the moon, water from his fingers, prophecies fulfilled." path="/miracles" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Sparkles className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Miracles of the Prophet ﷺ</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Studied</span><span className="text-sm font-medium">{count} / {MIRACLES.length}</span></div><Progress value={(count / MIRACLES.length) * 100} /></Card>
        <div className="flex gap-2"><Input placeholder="Search miracles…" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        {filtered.map(m => (
          <Card key={m.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [m.id]: !done[m.id] })}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="font-semibold text-heading">{m.title}</h2>
              {done[m.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <p className="text-sm mb-1">{m.summary}</p>
            <p className="text-micro text-muted-foreground italic">{m.reference}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Miracles;
