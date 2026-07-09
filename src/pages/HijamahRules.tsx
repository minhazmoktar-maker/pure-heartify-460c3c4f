import { Link } from "react-router-dom";
import { ArrowLeft, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function HijamahRules() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ḥijāmah — Cupping" description="A prophetic remedy" path="/hijamah-rules" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Droplets className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ḥijāmah — Cupping</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Evidence</h2>
        <Card key="0-0" className="p-4"><div>'Indeed the best of remedies you use is ḥijāmah' — Bukhari 5697.</div></Card>
        <h2 className="font-semibold pt-2">Sunnah Days</h2>
        <Card key="1-0" className="p-4"><div>17th, 19th, and 21st of the lunar month — Tirmidhī 2051.</div></Card>
      </div>
    </div>
  );
}
