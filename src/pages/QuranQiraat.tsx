import { Link } from "react-router-dom";
import { ArrowLeft, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['All mutawātir from the Prophet ﷺ.', 'Ḥafṣ ʿan ʿĀṣim — most widespread today.', 'Warsh ʿan Nāfiʿ — North Africa.', 'Differences enrich meaning; no contradiction.'];

export default function QuranQiraat() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="The Seven Qirā'āt — Heartify" description="The Seven Qirā'āt: Recitation modes." path="/qiraat" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Mic className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">The Seven Qirā'āt</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Recitation modes</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
