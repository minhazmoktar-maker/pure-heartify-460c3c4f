import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Ṣaḥīḥ, Ḥasan, Ḍaʿīf, Mawḍūʿ (fabricated).', 'Isnād (chain) + matn (text) both scrutinized.', 'Bukhārī & Muslim — highest authenticity threshold.', 'Fabricated ḥadīth may not be attributed to the Prophet ﷺ.'];

export default function HadithGrading() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ḥadīth Grading — Heartify" description="Ḥadīth Grading: Terminology." path="/hadith-grading" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <CheckCircle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ḥadīth Grading</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Terminology</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
