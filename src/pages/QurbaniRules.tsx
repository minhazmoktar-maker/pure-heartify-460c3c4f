import { Link } from "react-router-dom";
import { ArrowLeft, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function QurbaniRules() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Qurbānī / Uḍḥiyah — Eid Sacrifice" description="Rules of the Eid al-Aḍḥā sacrifice" path="/qurbani-rules" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Beef className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Qurbānī / Uḍḥiyah — Eid Sacrifice</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Eligibility</h2>
        <Card key="0-0" className="p-4"><div>Sheep/goat: 1 person. Cow/camel: up to 7 shares.</div></Card>
        <Card key="0-1" className="p-4"><div>Free of visible defects (blind, lame, sick, emaciated) — Abū Dāwūd 2802.</div></Card>
        <h2 className="font-semibold pt-2">Timing</h2>
        <Card key="1-0" className="p-4"><div>From after Eid ṣalāh on 10 Dhū'l-Ḥijjah through sunset of 13th.</div></Card>
      </div>
    </div>
  );
}
