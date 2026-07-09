import { Link } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Broken oath: feed 10 poor.', 'Zihār / intentional fast-break.', 'Manslaughter expiation.', 'Consult scholar for specifics.'];

export default function KaffarahGuide() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Kaffārah Guide — Heartify" description={'Expiations in fiqh.'} path="/kaffarah-guide" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Scale className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Kaffārah Guide</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Expiations in fiqh.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
