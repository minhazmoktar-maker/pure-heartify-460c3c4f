import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Avoid ribā-based finance roles.', 'No alcohol/gambling industries.', 'Modest workplace conditions.', 'Zakāt from earnings.'];

export default function HalalCareers() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Careers — Heartify" description={'Choosing permissible work.'} path="/halal-careers" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Briefcase className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Careers</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Choosing permissible work.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
