import { Link } from "react-router-dom";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Sunnah of archery, swimming, riding.', 'Modest gyms/segregated hours.', 'Halal supplements.', 'Consistency > intensity.'];

export default function MuslimFitness() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muslim Fitness — Heartify" description={'Strong body per prophetic guidance.'} path="/muslim-fitness" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Dumbbell className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muslim Fitness</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Strong body per prophetic guidance.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
