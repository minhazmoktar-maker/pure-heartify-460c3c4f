import { Link } from "react-router-dom";
import { ArrowLeft, Salad } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Meat is ḥalāl; abstaining as choice is fine.', "Cannot declare ḥalāl food ḥarām on oneself (Qur'an 5:87).", 'Prophet ﷺ ate meat when available; often modest.', 'Vegetarianism for health/ethics allowed, not as dogma.'];

export default function VegetarianismIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Vegetarianism & Islam — Heartify" description="Vegetarianism & Islam: View." path="/vegetarianism-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Salad className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Vegetarianism & Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">View</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
