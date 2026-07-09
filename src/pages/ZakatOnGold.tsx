import { Link } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function ZakatOnGold() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Zakāt on Gold & Silver" description="Niṣāb thresholds and the 2.5% rate" path="/zakat-on-gold" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Coins className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Zakāt on Gold & Silver</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Niṣāb</h2>
        <Card key="0-0" className="p-4"><div>Gold: 85 g (20 dinars).</div></Card>
        <Card key="0-1" className="p-4"><div>Silver: 595 g (200 dirhams).</div></Card>
        <h2 className="font-semibold pt-2">Rate</h2>
        <Card key="1-0" className="p-4"><div>2.5% of holdings owned for one lunar year (ḥawl).</div></Card>
      </div>
    </div>
  );
}
