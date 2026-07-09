import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Guard intention (niyyah).', 'Avoid ikhtilāṭ in content.', 'Disclose paid promotions.', "Do not sell what's ḥarām."];

export default function InfluencerEthics() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muslim Influencer Ethics — Heartify" description={'Fame, riyāʾ, and accountability.'} path="/influencer-ethics" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Star className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muslim Influencer Ethics</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Fame, riyāʾ, and accountability.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
