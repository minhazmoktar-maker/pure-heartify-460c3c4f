import { Link } from "react-router-dom";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Ḥabbah as-sawdā' (black seed), honey, cupping.", "Ibn Sīnā's Qānūn — European med text for 600 years.", 'Balance prophetic guidance with modern medicine.', 'Never abandon proven treatment for weak narrations.'];

export default function IslamicMedicine() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṭibb al-Islāmī — Heartify" description="Ṭibb al-Islāmī: Prophetic & classical." path="/islamic-medicine" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Stethoscope className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṭibb al-Islāmī</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Prophetic & classical</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
