import { Link } from "react-router-dom";
import { ArrowLeft, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Monthly sponsorship > one-off gifts.', 'Ensure schooling + healthcare.', "Preserve child's lineage & rights.", 'Report from field regularly.'];

export default function OrphanSponsorship() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Orphan Sponsorship — Heartify" description={'The prophetic virtue of kafālat al-yatīm.'} path="/orphan-sponsorship" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Baby className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Orphan Sponsorship</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">The prophetic virtue of kafālat al-yatīm.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
