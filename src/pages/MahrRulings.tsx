import { Link } from "react-router-dom";
import { ArrowLeft, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Wife's exclusive right (Qur'an 4:4).", 'Any lawful amount agreed upon — even an iron ring (Bukhari 5150).', 'Simplicity is blessed; extravagance discouraged.', 'Cannot be reclaimed by husband.'];

export default function MahrRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Mahr (Dowry) — Heartify" description="Mahr (Dowry): Rights of the bride." path="/mahr-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Gift className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Mahr (Dowry)</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rights of the bride</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
