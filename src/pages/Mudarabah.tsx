import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['One party capital, other labor.', 'Profit shared per agreed ratio; losses on capital-provider unless negligence.', 'Backbone of Islamic bank deposits.', 'Used for investment accounts.'];

export default function Mudarabah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muḍārabah — Heartify" description="Muḍārabah: Trust financing." path="/mudarabah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Briefcase className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muḍārabah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Trust financing</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
