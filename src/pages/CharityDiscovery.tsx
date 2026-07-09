import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Verify 100% donation policies.', 'Check audited financials.', 'Prefer local + global mix.', 'Track impact reports quarterly.'];

export default function CharityDiscovery() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Charity Discovery — Heartify" description={'Finding trusted zakāt-eligible charities.'} path="/charity-discovery" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Heart className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Charity Discovery</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Finding trusted zakāt-eligible charities.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
