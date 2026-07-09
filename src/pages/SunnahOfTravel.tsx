import { Link } from "react-router-dom";
import { ArrowLeft, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SunnahOfTravel() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sunnah of Travel" description="Duas and adab of the traveler" path="/sunnah-of-travel" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Plane className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sunnah of Travel</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Before</h2>
        <Card key="0-0" className="p-4"><div>Two rakʿats before leaving; pray to Allāh for provision and return.</div></Card>
        <h2 className="font-semibold pt-2">On the way</h2>
        <Card key="1-0" className="p-4"><div>Recite the travel duʿāʾ; say Allāhu Akbar on ascent, Subḥān-Allāh on descent.</div></Card>
      </div>
    </div>
  );
}
