import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HeartHandshake, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Step = { id: string; number: number; title: string; detail: string };

const STEPS: Step[] = [
  { id: "s1", number: 1, title: "Immediate cessation", detail: "Stop the sin immediately. Continuing while asking forgiveness is mockery of tawbah." },
  { id: "s2", number: 2, title: "Sincere regret (nadam)", detail: "Feel remorse from the heart for having disobeyed Allah — 'Regret is repentance.' (Ibn Majah 4252)" },
  { id: "s3", number: 3, title: "Firm resolve never to return", detail: "A binding intention not to fall into it again, even if you may weaken later." },
  { id: "s4", number: 4, title: "Restore rights (haqq al-'ibad)", detail: "If the sin involved others (theft, backbiting, oppression), return their rights or seek their pardon before meeting Allah." },
  { id: "s5", number: 5, title: "Do it before the soul reaches the throat", detail: "Tawbah is not accepted at the moment of death, nor after the sun rises from the west. (Nisa' 4:18)" },
  { id: "s6", number: 6, title: "Pray Salat at-Tawbah", detail: "Make wudu well, pray 2 rak'ahs, then ask Allah's forgiveness — He will forgive. (Abu Dawud 1521)" },
  { id: "s7", number: 7, title: "Increase in good deeds", detail: "'Indeed, good deeds erase bad deeds.' (Hud 11:114) — follow every sin with a good deed." },
  { id: "s8", number: 8, title: "Change environment & companions", detail: "Cut off what leads back to the sin. Righteous company is a fortress." },
  { id: "s9", number: 9, title: "Say Sayyid al-Istighfar morning & evening", detail: "'Whoever says it with certainty and dies before the evening will be from the people of Paradise.' (Bukhari 6306)" },
  { id: "s10", number: 10, title: "Never despair", detail: "'O My servants who have transgressed — do not despair of Allah's mercy. Allah forgives all sins.' (Zumar 39:53)" },
];

const STORAGE_KEY = "tawbah.done";

const Tawbah = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Tawbah — Sincere Repentance in Islam" description="The conditions, steps, and prophetic du'as of sincere repentance from Qur'an and Sunnah." path="/tawbah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><HeartHandshake className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Tawbah — Sincere Repentance</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4 bg-primary/5"><p className="text-sm italic">"And turn to Allah in repentance, all of you, O believers, that you may succeed." — <span className="text-muted-foreground">Qur'an 24:31</span></p></Card>
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Conditions internalized</span><span className="text-sm font-medium">{count} / {STEPS.length}</span></div><Progress value={(count / STEPS.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        <div className="grid gap-3">{STEPS.map(s => (
          <Card key={s.id} className={`p-4 cursor-pointer ${done[s.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [s.id]: !done[s.id] })}>
            <div className="flex items-start gap-3"><Badge variant="secondary">{s.number}</Badge><div><h3 className="font-semibold mb-1">{s.title}</h3><p className="text-sm text-muted-foreground">{s.detail}</p></div></div>
          </Card>
        ))}</div>
        <Card className="p-5">
          <h3 className="font-semibold mb-2">Sayyid al-Istighfar</h3>
          <p className="text-heading text-right leading-loose mb-2" dir="rtl">ٱللَّهُمَّ أَنْتَ رَبِّي لَا إِلَـٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا ٱسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَٱغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ ٱلذُّنُوبَ إِلَّا أَنْتَ</p>
          <p className="text-micro text-muted-foreground">Bukhari 6306</p>
        </Card>
      </div>
    </div>
  );
};

export default Tawbah;
