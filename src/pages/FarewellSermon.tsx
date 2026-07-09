import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mic, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Point = { id: string; heading: string; text: string };

const POINTS: Point[] = [
  { id: "sanctity", heading: "Sanctity of life, wealth, and honour", text: "'Your blood, your property, and your honour are sacred to you as this day of yours, in this month of yours, in this land of yours.'" },
  { id: "usury", heading: "Abolition of ribā", text: "'All ribā of Jāhiliyyah is annulled. The first ribā I annul is that of my uncle al-'Abbās ibn 'Abd al-Muṭṭalib — it is annulled in its entirety.'" },
  { id: "blood", heading: "Abolition of blood-vengeance of Jāhiliyyah", text: "'All the blood-feuds of Jāhiliyyah are abolished. The first I annul is the blood of Ibn Rabī'ah ibn al-Ḥārith.'" },
  { id: "women", heading: "Rights of women", text: "'Fear Allah regarding women, for you took them by the trust of Allah… they have rights over you as you have rights over them.'" },
  { id: "brotherhood", heading: "Racial equality & brotherhood", text: "'O people, your Lord is one and your father is one. No Arab has superiority over a non-Arab, nor a non-Arab over an Arab, nor red over black, nor black over red — except by taqwā.'" },
  { id: "trust", heading: "Two things — never go astray", text: "'I have left among you what, if you hold fast to it, you will never go astray: the Book of Allah and my Sunnah.'" },
  { id: "witness", heading: "The final testimony", text: "'Have I not conveyed the message?' — they said 'Yes.' He raised his finger to the sky and said three times: 'O Allah, bear witness.'" },
  { id: "revelation", heading: "The completion of the religion", text: "That day was revealed: 'This day I have perfected for you your religion and completed My favour upon you and have approved for you Islam as religion.' (Qur'an 5:3)" },
];

const KEY = "farewell.done";

const FarewellSermon = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="The Farewell Sermon — Khuṭbat al-Wadā'" description="The final sermon of the Prophet Muḥammad ﷺ at 'Arafah — a charter of universal human dignity, delivered before 100,000+ pilgrims." path="/farewell-sermon" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Mic className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">The Farewell Sermon</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4 bg-primary/5"><p className="text-sm">Delivered at 'Arafah on 9 Dhū'l-Ḥijjah 10 AH (632 CE) during the Farewell Ḥajj, three months before the Prophet's ﷺ death — before roughly 124,000 Companions.</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Studied</span><span className="text-sm font-medium">{count} / {POINTS.length}</span></div><Progress value={(count / POINTS.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        {POINTS.map(p => (
          <Card key={p.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [p.id]: !done[p.id] })}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="font-semibold">{p.heading}</h2>
              {done[p.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <p className="text-sm text-muted-foreground italic">"{p.text}"</p>
          </Card>
        ))}
        <p className="text-xs text-muted-foreground text-center">Sources: Bukhari, Muslim, Tirmidhī, Abū Dāwūd, Ibn Mājah, Musnad Aḥmad.</p>
      </div>
    </div>
  );
};

export default FarewellSermon;
