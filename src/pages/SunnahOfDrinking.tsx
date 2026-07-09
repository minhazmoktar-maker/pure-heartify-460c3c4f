import { Link } from "react-router-dom";
import { ArrowLeft, GlassWater } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SunnahOfDrinking() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sunnah of Drinking" description="Three sips, right hand" path="/sunnah-of-drinking" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <GlassWater className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sunnah of Drinking</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Manner</h2>
        <Card key="0-0" className="p-4"><div>Drink in three breaths outside the vessel (Muslim 2028).</div></Card><Card key="0-1" className="p-4"><div>Sit while drinking; Zamzam may be drunk standing.</div></Card>
      </div>
    </div>
  );
}
