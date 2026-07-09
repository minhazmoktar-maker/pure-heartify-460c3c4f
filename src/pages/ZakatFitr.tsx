import { Link } from "react-router-dom";
import { ArrowLeft, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function ZakatFitr() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Zakāt al-Fiṭr" description="Charity of breaking the fast — obligatory before Eid" path="/zakat-fitr" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Wheat className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Zakāt al-Fiṭr</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Amount</h2>
        <Card key="0-0" className="p-4"><div>One ṣā' (~2.5–3 kg) of staple food per person (Bukhari 1503).</div></Card>
        <h2 className="font-semibold pt-2">Timing</h2>
        <Card key="1-0" className="p-4"><div>Paid before the Eid prayer.</div></Card>
        <Card key="1-1" className="p-4"><div>Given to the poor and needy.</div></Card>
      </div>
    </div>
  );
}
