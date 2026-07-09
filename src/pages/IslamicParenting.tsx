import { Link } from "react-router-dom";
import { ArrowLeft, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Ages 0-7: play with them.', 'Ages 7-14: teach & discipline.', 'Ages 14+: befriend & consult.', 'Teach ṣalāh at 7, enforce at 10 (Abu Dawud 495).'];

export default function IslamicParenting() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Parenting — Heartify" description="Islamic Parenting: Prophetic method." path="/islamic-parenting" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Baby className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Parenting</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Prophetic method</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
