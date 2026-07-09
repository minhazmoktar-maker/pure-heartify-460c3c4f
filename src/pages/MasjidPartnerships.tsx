import { Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Verified khaṭīb accounts.', 'Jamāʿah + iqāmah publishing.', 'Sadaqah collection widgets.', 'Youth halaqah scheduling.'];

export default function MasjidPartnerships() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Masjid Partnerships — Heartify" description={'How mosques integrate with Heartify.'} path="/masjid-partnerships" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Building2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Masjid Partnerships</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">How mosques integrate with Heartify.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
