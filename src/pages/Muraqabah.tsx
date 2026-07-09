import { Link } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Qur'an 57:4 — 'He is with you wherever you are.'",
  "Qur'an 50:16 — 'We are nearer to him than his jugular vein.'",
  "Qur'an 4:1 — 'Indeed Allah is ever, over you, a Watcher.'"
];
const S1 = [
  "Begin the day with an intention: 'Allah sees me.'",
  "Pause before a sin — recall Al-Baṣīr, ar-Raqīb.",
  "Nightly muḥāsabah (self-audit).",
  "Silence and khalwah (short time alone in dhikr)."
];

export default function Muraqabah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Murāqabah — Vigilance of the Heart" description="Living with the awareness that Allah sees, hears, and knows — the soul of iḥsān." path="/muraqabah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Eye className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Murāqabah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Foundations</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Practice</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}