import { Link } from "react-router-dom";
import { ArrowLeft, Split } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['One pronouncement during ṭuhr (purity, no intercourse).', 'Wait iddah of 3 menstrual cycles.', 'Reconciliation possible during first two.', 'Three ṭalāqs in one sitting — disputed but generally counted as one by Ibn Taymiyyah, Ibn al-Qayyim.'];

export default function DivorceProcedure() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṭalāq Procedure — Heartify" description="Ṭalāq Procedure: Correct sunnah method." path="/divorce-procedure" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Split className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṭalāq Procedure</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Correct sunnah method</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
