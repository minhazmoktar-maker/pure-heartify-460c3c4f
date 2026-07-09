import { Link } from "react-router-dom";
import { ArrowLeft, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Interest-free loan; repay principal only.', "'Whoever gives qarḍ ḥasan…Allah multiplies' (Qur'an 57:11).", 'Foundation of mutual aid in ummah.', 'Modern qarḍ ḥasan funds & apps exist.'];

export default function QardHasan() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Qarḍ Ḥasan — Heartify" description="Qarḍ Ḥasan: Benevolent loan." path="/qard-hasan" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <HandCoins className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Qarḍ Ḥasan</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Benevolent loan</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
