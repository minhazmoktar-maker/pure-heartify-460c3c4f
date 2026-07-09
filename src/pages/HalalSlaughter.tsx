import { Link } from "react-router-dom";
import { ArrowLeft, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Muslim, Jew, or Christian slaughterer (Qur'an 5:5).", "Bismillāh at the moment of slaughter (Qur'an 6:121).", 'Sharp blade severing trachea, esophagus, two jugulars.', 'Blood must drain; animal not seeing others slaughtered.'];

export default function HalalSlaughter() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Slaughter (Dhabīḥah) — Heartify" description="Halal Slaughter (Dhabīḥah): Conditions." path="/halal-slaughter" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Beef className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Slaughter (Dhabīḥah)</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Conditions</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
