import { Link } from "react-router-dom";
import { ArrowLeft, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Dates, olive oil, honey, barley.', 'Third-food-third-water-third-air rule.', 'Eat with right hand.', 'Bismillāh before, Alhamdulillāh after.'];

export default function PropheticDiet() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Prophetic Diet — Heartify" description={'Foods loved by the Prophet ﷺ.'} path="/prophetic-diet" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Apple className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Prophetic Diet</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Foods loved by the Prophet ﷺ.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
