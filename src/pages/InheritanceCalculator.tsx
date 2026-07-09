import { Link } from "react-router-dom";
import { ArrowLeft, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Apply Qur'anic fixed shares first.", 'Residuary heirs by ʿaṣabah.', 'Consult ʿālim on edge cases.', 'Document via valid wasiyyah.'];

export default function InheritanceCalculator() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Inheritance (Farāʾiḍ) Calculator — Heartify" description={'Modern tools for mīrāth.'} path="/inheritance-calculator" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Calculator className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Inheritance (Farāʾiḍ) Calculator</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Modern tools for mīrāth.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
