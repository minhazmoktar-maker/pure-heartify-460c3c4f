import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Up to four, conditional on justice (Qur'an 4:3).", "'If you fear you cannot be just — then one' (Qur'an 4:3).", 'Equal time, housing, provision required.', 'Not encouraged as default; permitted with fairness.'];

export default function PolygamyRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Polygamy in Islam — Heartify" description="Polygamy in Islam: Conditions." path="/polygamy-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Polygamy in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Conditions</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
