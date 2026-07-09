import { Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Cash waqf, corporate waqf, waqf-linked sukūk.', "Revives Prophet ﷺ's model for sustainable ṣadaqah jāriyah.", 'Funds schools, hospitals, masjids permanently.', 'Malaysia, Turkey, Kuwait have advanced waqf boards.'];

export default function WaqfModern() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Modern Waqf — Heartify" description="Modern Waqf: Endowments today." path="/waqf-modern" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Building2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Modern Waqf</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Endowments today</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
