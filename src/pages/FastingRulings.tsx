import { Link } from "react-router-dom";
import { ArrowLeft, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function FastingRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Fasting Rulings & Nullifiers" description="What breaks the fast and what doesn't" path="/fasting-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Utensils className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Fasting Rulings & Nullifiers</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Breaks Fast</h2>
        <Card key="0-0" className="p-4"><div>Eating/drinking deliberately.</div></Card>
        <Card key="0-1" className="p-4"><div>Intercourse (also incurs kaffārah).</div></Card>
        <Card key="0-2" className="p-4"><div>Deliberate vomiting.</div></Card>
        <Card key="0-3" className="p-4"><div>Menstruation or nifās.</div></Card>
        <h2 className="font-semibold pt-2">Does Not Break</h2>
        <Card key="1-0" className="p-4"><div>Forgetful eating (Bukhari 1933).</div></Card>
        <Card key="1-1" className="p-4"><div>Involuntary vomiting.</div></Card>
        <Card key="1-2" className="p-4"><div>Miswak, tasting food without swallowing.</div></Card>
      </div>
    </div>
  );
}
