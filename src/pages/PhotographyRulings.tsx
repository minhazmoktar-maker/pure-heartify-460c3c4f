import { Link } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Statues/idols categorically ḥarām (Bukhari 5951).', 'Necessity photos (ID, passport, education) permitted by contemporary scholars.', 'Avoid glorification or displaying prominently.', 'Never depict Prophets ﷺ or Ṣaḥābah.'];

export default function PhotographyRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Images & Photography — Heartify" description="Images & Photography: Rulings." path="/photography-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Camera className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Images & Photography</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rulings</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
