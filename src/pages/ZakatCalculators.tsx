import { Link } from "react-router-dom";
import { ArrowLeft, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Niṣāb: 85g gold or 595g silver (silver preferred for poor benefit).', '2.5% on wealth held one lunar year.', 'Include cash, gold, silver, business inventory, receivables.', 'Deduct immediate debts.'];

export default function ZakatCalculators() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Zakāt Calculators & Tools — Heartify" description="Zakāt Calculators & Tools: Compute correctly." path="/zakat-calculators" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Calculator className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Zakāt Calculators & Tools</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Compute correctly</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
