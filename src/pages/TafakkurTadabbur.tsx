import { Link } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Qur'an 3:190-191 — 'Those who remember Allah standing, sitting, and on their sides, and reflect on the creation of the heavens and earth.'",
  "'An hour of tafakkur is better than a year of worship' — attributed to Ibn 'Abbās."
];
const S1 = [
  "Qur'an 47:24 — 'Do they not ponder the Qur'an, or are there locks upon their hearts?'",
  "Read slowly with meaning, one page with tadabbur > one juz' racing.",
  "Ask: what does this teach me about Allah? about myself? about my day?"
];

export default function TafakkurTadabbur() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Tafakkur & Tadabbur — Reflection" description="Reflecting on Allah's creation and pondering the Qur'an — an act of worship greater than a year of nafl." path="/tafakkur" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Brain className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Tafakkur & Tadabbur</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">On creation</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">On Qur'an</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}