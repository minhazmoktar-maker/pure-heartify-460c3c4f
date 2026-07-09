import { Link } from "react-router-dom";
import { ArrowLeft, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Qur'an 5:90 pairs it with khamr.", 'Lottery, betting, prize draws with paid entry — ḥarām.', 'Insurance elements of maysir are disputed; scholars require takāful alternative.', 'Fantasy sports for money, casino apps — same ruling.'];

export default function GamblingRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Gambling (Maysir) — Heartify" description="Gambling (Maysir): Prohibited." path="/gambling-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Dices className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Gambling (Maysir)</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Prohibited</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
