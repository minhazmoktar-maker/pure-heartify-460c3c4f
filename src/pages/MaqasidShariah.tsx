import { Link } from "react-router-dom";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Preserve: dīn, life, intellect, lineage, wealth.', 'Ḥājiyāt (needs) & taḥsīniyyāt (improvements).', 'Frames modern issues (bioethics, finance).', "Al-Shāṭibī's Muwāfaqāt — classic reference."];

export default function MaqasidShariah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Maqāṣid ash-Sharīʿah — Heartify" description="Maqāṣid ash-Sharīʿah: Objectives." path="/maqasid" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Target className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Maqāṣid ash-Sharīʿah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Objectives</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
