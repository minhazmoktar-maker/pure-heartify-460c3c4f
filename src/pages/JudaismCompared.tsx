import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Both descend from Ibrāhīm ﷺ.', "Torah affirmed as originally revealed (Qur'an 5:44).", 'Differences on tawḥīd, prophethood of Muhammad ﷺ.', 'Historical coexistence in Andalus and Ottoman lands.'];

export default function JudaismCompared() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islam & Judaism — Heartify" description="Islam & Judaism: Shared roots." path="/judaism-compared" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Star className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islam & Judaism</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Shared roots</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
