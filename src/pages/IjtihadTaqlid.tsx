import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Ijtihād reserved for qualified mujtahids.', 'Laypeople follow a trusted scholar (taqlīd).', 'Ittibāʿ = following with evidence.', 'Avoid tatabbuʿ ar-rukhaṣ — hunting for easiest opinions.'];

export default function IjtihadTaqlid() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ijtihād & Taqlīd — Heartify" description="Ijtihād & Taqlīd: When to follow, when to derive." path="/ijtihad-taqlid" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Compass className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ijtihād & Taqlīd</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">When to follow, when to derive</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
