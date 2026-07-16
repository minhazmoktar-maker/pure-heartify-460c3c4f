import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

import { HISNUL_DUAS as DUAS } from "@/data/hisnul";


const KEY = "hisnul.done";
const Hisnul = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [q, setQ] = useState("");
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;
  const filtered = DUAS.filter(d => (d.title + d.english).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Ḥiṣn al-Muslim — Fortress of the Muslim Protection Du'ās" description="Authentic Sunnah supplications for daily protection — Ayat al-Kursi, three Quls, refuge from shirk, distress, debt, and nightmares." path="/hisnul" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Shield className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Ḥiṣn al-Muslim — Fortress of the Muslim</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Recited today</span><span className="text-sm font-medium">{count} / {DUAS.length}</span></div><Progress value={(count / DUAS.length) * 100} /></Card>
        <div className="flex gap-2"><Input placeholder="Search protection…" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        {filtered.map(d => (
          <Card key={d.id} className={`p-4 space-y-2 ${done[d.id] ? "border-primary/50 bg-primary/5" : ""}`}>
            <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{d.title}{d.count ? ` · ×${d.count}` : ""}</h2><Button size="sm" variant={done[d.id] ? "default" : "outline"} onClick={() => persist({ ...done, [d.id]: !done[d.id] })}>{done[d.id] ? "Done" : "Mark"}</Button></div>
            <p className="text-right text-heading leading-loose" dir="rtl">{d.arabic}</p>
            <p className="italic text-sm text-muted-foreground">{d.translit}</p>
            <p className="text-sm">{d.english}</p>
            <p className="text-micro text-muted-foreground">{d.ref}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default Hisnul;
