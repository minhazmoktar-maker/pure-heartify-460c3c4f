import { Link } from "react-router-dom";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Rapid ṣadaqah channels.', 'Coordinate with local scholars.', 'Avoid duplication with big NGOs.', 'Prioritize orphans & widows.'];

export default function DisasterRelief() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Disaster Relief — Heartify" description={'How Muslims mobilize aid ethically.'} path="/disaster-relief" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <LifeBuoy className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Disaster Relief</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">How Muslims mobilize aid ethically.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
