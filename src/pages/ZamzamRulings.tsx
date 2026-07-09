import { Link } from "react-router-dom";
import { ArrowLeft, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Face Qiblah, three sips.', 'Duʿāʾ before drinking.', 'Never disrespect the water.', 'Share as a gift is sunnah.'];

export default function ZamzamRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Zamzam Water Rulings — Heartify" description={'Etiquette & fiqh of Zamzam.'} path="/zamzam-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Droplet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Zamzam Water Rulings</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Etiquette & fiqh of Zamzam.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
