import { Link } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Nafs: ammārah, lawwāmah, muṭma'innah.", 'Rūḥ, qalb, ʿaql — integrated model.', 'Al-Ghazālī, Ibn al-Qayyim — foundational works.', 'Therapy compatible with tawḥīd — TIIP model modern.'];

export default function IslamicPsychology() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="ʿIlm an-Nafs (Islamic Psychology) — Heartify" description="ʿIlm an-Nafs (Islamic Psychology): Framework." path="/islamic-psychology" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Brain className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">ʿIlm an-Nafs (Islamic Psychology)</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Framework</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
