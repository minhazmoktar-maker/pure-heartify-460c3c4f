import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Verify certification body & source.', 'Prefer zabīḥah where available.', 'Avoid alcohol-serving establishments when possible.', 'Report mislabeled listings.'];

export default function HalalRestaurants() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Restaurants Directory — Heartify" description={'Finding trustworthy halal food globally.'} path="/halal-restaurants" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <MapPin className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Restaurants Directory</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Finding trustworthy halal food globally.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
