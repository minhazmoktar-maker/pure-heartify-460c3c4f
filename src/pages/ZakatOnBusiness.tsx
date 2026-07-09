import { Link } from "react-router-dom";
import { ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function ZakatOnBusiness() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Zakāt on Business Assets" description="How to value stock, cash, and receivables" path="/zakat-on-business" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Store className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Zakāt on Business Assets</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Assets</h2>
        <Card key="0-0" className="p-4"><div>Cash + inventory (at market value) + reliable receivables.</div></Card>
        <h2 className="font-semibold pt-2">Deductions</h2>
        <Card key="1-0" className="p-4"><div>Immediate business debts due within the year.</div></Card>
        <Card key="1-1" className="p-4"><div>Pay 2.5% on the net at the end of the ḥawl.</div></Card>
      </div>
    </div>
  );
}
