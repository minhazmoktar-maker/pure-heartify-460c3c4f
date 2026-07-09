import { Link } from "react-router-dom";
import { ArrowLeft, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["'Whoever says Subḥān Allāh 100× — sins fall off' (Muslim 2691).", 'Fortress against Shayṭān (Tirmidhi 2863).', "Heart's tranquility (Qur'an 13:28).", 'Lifelong practice, not seasonal.'];

export default function DhikrBenefits() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Benefits of Dhikr — Heartify" description="Benefits of Dhikr: Prophetic promises." path="/dhikr-benefits" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sparkle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Benefits of Dhikr</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Prophetic promises</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
