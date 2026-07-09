import { Link } from "react-router-dom";
import { ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Bank buys asset, sells to client at disclosed markup.', 'Payment deferred; markup fixed — not ribā.', 'Ownership must transfer to bank first.', 'Common for home, car, commodity financing.'];

export default function MurabahaFinance() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Murābaḥah Financing — Heartify" description="Murābaḥah Financing: Cost-plus sale." path="/murabaha-finance" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Store className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Murābaḥah Financing</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Cost-plus sale</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
