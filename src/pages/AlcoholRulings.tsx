import { Link } from "react-router-dom";
import { ArrowLeft, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Ḥarām in any quantity (Qur'an 5:90-91).", "'What intoxicates in large amounts, its small amount is ḥarām' (Tirmidhi 1865).", 'Serving, transporting, selling — all cursed (Ibn Majah 3380).', 'Applies to marijuana, narcotics, vape drugs, etc.'];

export default function AlcoholRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Alcohol & Intoxicants — Heartify" description="Alcohol & Intoxicants: Definitive prohibition." path="/alcohol-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Wine className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Alcohol & Intoxicants</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Definitive prohibition</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
