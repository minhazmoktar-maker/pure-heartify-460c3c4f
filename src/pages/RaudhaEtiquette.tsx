import { Link } from "react-router-dom";
import { ArrowLeft, Flower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Lower the voice.', 'Send abundant ṣalawāt.', 'Do not push others.', 'Duʿāʾ with tawassul via good deeds.'];

export default function RaudhaEtiquette() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Rawḍah Etiquette — Heartify" description={"Manners in the Prophet's masjid."} path="/raudha-etiquette" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Flower className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Rawḍah Etiquette</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Manners in the Prophet's masjid.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
