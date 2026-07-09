import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function QadrDivineDecree() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Qadr — Divine Decree" description="Belief in what Allah has decreed" path="/qadr-divine-decree" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Compass className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Qadr — Divine Decree</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Four Levels</h2>
        <Card key="0-0" className="p-4"><div>'Ilm (knowledge), kitābah (writing), mashī'ah (will), khalq (creation).</div></Card>
        <h2 className="font-semibold pt-2">Balance</h2>
        <Card key="1-0" className="p-4"><div>We act with free choice while trusting Allah's decree — Muslim 2664.</div></Card>
      </div>
    </div>
  );
}
