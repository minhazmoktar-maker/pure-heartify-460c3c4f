import { Link } from "react-router-dom";
import { ArrowLeft, Rabbit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Woman entered Hellfire for starving a cat (Bukhari 3318).', 'Man forgiven for giving thirsty dog water (Bukhari 173).', 'No branding face; no using animal as target (Muslim 2117).', 'Slaughter humanely with sharp blade.'];

export default function AnimalRights() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Animal Rights in Islam — Heartify" description="Animal Rights in Islam: Prophetic mercy." path="/animal-rights" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Rabbit className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Animal Rights in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Prophetic mercy</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
