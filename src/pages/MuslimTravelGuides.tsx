import { Link } from "react-router-dom";
import { ArrowLeft, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Prayer-friendly hotels & airports.', 'Halal food maps.', 'Qiblah + prayer-time apps offline.', 'Modest attire & climate tips.'];

export default function MuslimTravelGuides() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muslim Travel Guides — Heartify" description={'Ḥalāl-friendly travel planning.'} path="/muslim-travel-guides" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Plane className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muslim Travel Guides</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Ḥalāl-friendly travel planning.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
