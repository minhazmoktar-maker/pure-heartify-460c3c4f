import { Link } from "react-router-dom";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['No shirk imagery or music.', 'Educational Islamic content preferred.', 'Time-limits & tarbiyah.', 'Play together as family.'];

export default function HalalKidsGames() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Games for Kids — Heartify" description={'Screening entertainment for children.'} path="/halal-kids-games" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Gamepad2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Games for Kids</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Screening entertainment for children.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
