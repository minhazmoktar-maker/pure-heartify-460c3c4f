import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Up to 1/3 for non-heirs.', 'Debts before distribution.', 'Two just witnesses.', 'Register per local law.'];

export default function WillWriting() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Will Writing — Heartify" description={'Waṣiyyah essentials.'} path="/will-writing" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Will Writing</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Waṣiyyah essentials.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
