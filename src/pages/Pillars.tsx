import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Columns, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Pillar = { id: string; name: string; arabic: string; summary: string; detail: string; reference: string };

const PILLARS: Pillar[] = [
  { id: "shahadah", name: "Shahādah — Testimony of Faith", arabic: "الشهادة", summary: "Bearing witness that there is no deity worthy of worship except Allah, and that Muhammad ﷺ is His Messenger.", detail: "The gateway to Islam. Said with sincere belief in the heart, affirmed with the tongue, and lived by the limbs. It negates all false objects of worship and affirms Allah alone.", reference: "Sahih al-Bukhari 8; Sahih Muslim 16" },
  { id: "salah", name: "Salāh — Prayer", arabic: "الصلاة", summary: "Five daily prayers at their appointed times.", detail: "The first deed judged on the Day of Rising. It is the direct link between the servant and his Lord — established with wudu, khushu', and on time.", reference: "Qur'an 4:103; Tirmidhi 413" },
  { id: "zakah", name: "Zakāh — Obligatory Charity", arabic: "الزكاة", summary: "2.5% on qualifying wealth held for a lunar year, given to the eight categories in Sūrah at-Tawbah 9:60.", detail: "Purifies wealth and the heart from stinginess. Withholding it is a major sin threatening painful punishment (Qur'an 9:34-35).", reference: "Qur'an 9:60; Bukhari 1395" },
  { id: "sawm", name: "Sawm — Fasting Ramadan", arabic: "الصوم", summary: "Fasting from dawn to sunset every day of Ramadan.", detail: "Prescribed to attain taqwa (Qur'an 2:183). Abstaining from food, drink, and intimacy — and guarding the tongue and limbs from sin.", reference: "Qur'an 2:183-185; Bukhari 1904" },
  { id: "hajj", name: "Ḥajj — Pilgrimage", arabic: "الحج", summary: "Once in a lifetime for the physically and financially able.", detail: "Standing at 'Arafah, tawaf around the Ka'bah, sa'i between Safa and Marwah — an accepted Hajj has no reward less than Paradise.", reference: "Qur'an 3:97; Bukhari 1521" },
];

const KEY = "pillars.done";

const Pillars = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="The Five Pillars of Islam — Shahadah, Salah, Zakah, Sawm, Hajj" description="The five foundational pillars of Islam explained from the Qur'an and authentic Sunnah, with references." path="/pillars" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Columns className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">The Five Pillars of Islam</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Pillars reviewed</span><span className="text-sm font-medium">{count} / {PILLARS.length}</span></div><Progress value={(count / PILLARS.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        {PILLARS.map((p, i) => (
          <Card key={p.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [p.id]: !done[p.id] })}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-3"><Badge variant="secondary">#{i + 1}</Badge><h2 className="font-semibold text-lg">{p.name}</h2></div>
              {done[p.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <div className="text-2xl text-right font-arabic mb-2">{p.arabic}</div>
            <p className="text-sm mb-2">{p.summary}</p>
            <p className="text-sm text-muted-foreground mb-2">{p.detail}</p>
            <p className="text-xs text-muted-foreground italic">{p.reference}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Pillars;
