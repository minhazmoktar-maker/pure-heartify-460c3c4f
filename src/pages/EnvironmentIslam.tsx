import { Link } from "react-router-dom";
import { ArrowLeft, TreeDeciduous } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Human as khalīfah — trustee of earth (Qur'an 2:30).", 'No waste (isrāf) even by a river (Ibn Majah 425).', 'Prophet ﷺ planted trees; forbade harming animals needlessly.', 'Ḥimā — protected sanctuaries in Islamic tradition.'];

export default function EnvironmentIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Environment & Islam — Heartify" description="Environment & Islam: Stewardship." path="/environment-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <TreeDeciduous className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Environment & Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Stewardship</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
