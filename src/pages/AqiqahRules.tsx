import { Link } from "react-router-dom";
import { ArrowLeft, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function AqiqahRules() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="'Aqīqah — Newborn Sacrifice" description="Sunnah of sacrificing for a newborn" path="/aqiqah-rules" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Baby className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">'Aqīqah — Newborn Sacrifice</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Amount</h2>
        <Card key="0-0" className="p-4"><div>Two sheep for a boy, one for a girl — Tirmidhī 1513.</div></Card>
        <h2 className="font-semibold pt-2">Day</h2>
        <Card key="1-0" className="p-4"><div>Ideally the 7th day, with naming and shaving the head.</div></Card>
      </div>
    </div>
  );
}
