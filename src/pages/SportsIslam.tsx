import { Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Prophet ﷺ raced ʿĀ'ishah (Ahmad 26320).", 'Archery, horsemanship, swimming encouraged (Bayhaqi 20214).', 'Avoid ʿawrah exposure, mixed environments, missing prayer.', 'No gambling attached; no violence for entertainment.'];

export default function SportsIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sports in Islam — Heartify" description="Sports in Islam: Guidance." path="/sports-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Trophy className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sports in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Guidance</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
