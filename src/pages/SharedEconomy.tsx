import { Link } from "react-router-dom";
import { ArrowLeft, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Ijārah (rental) and mushārakah (partnership) — well-established fiqh.', 'Avoid ribā-based ride/rental platforms.', 'Transparency in fees; no gharar (excessive uncertainty).', 'Airbnb/Uber-style permissible if halal use enforced.'];

export default function SharedEconomy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sharing Economy in Islam — Heartify" description="Sharing Economy in Islam: Rulings." path="/shared-economy" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Handshake className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sharing Economy in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rulings</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
