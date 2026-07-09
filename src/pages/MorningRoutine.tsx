import { Link } from "react-router-dom";
import { ArrowLeft, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Fajr in jamāʿah — protection all day.', 'Adhkār aṣ-ṣabāḥ (morning remembrances).', 'Two rakʿah duḥā unlocks daily provision.', "'Barakah is in the early morning' (Abu Dawud 2606)."];

export default function MorningRoutine() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Morning Routine — Heartify" description="Islamic Morning Routine: Barakah in early hours." path="/morning-routine" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sunrise className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Morning Routine</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Barakah in early hours</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
