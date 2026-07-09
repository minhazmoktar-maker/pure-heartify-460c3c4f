import { Link } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Asset-backed certificates, not debt.', 'Investor owns share of underlying asset — real risk.', 'Types: ijārah, murābaḥah, mushārakah sukūk.', 'Global market — Malaysia, UAE, Saudi leading issuers.'];

export default function Sukuk() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sukūk (Islamic Bonds) — Heartify" description="Sukūk (Islamic Bonds): How they work." path="/sukuk" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Coins className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sukūk (Islamic Bonds)</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">How they work</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
