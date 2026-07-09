import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['ʿAdl (justice) over bias.', 'Two-witness principle in disputes.', 'Right of appeal preserved.', 'Public logs where possible.'];

export default function ModerationEthics() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Content Moderation Ethics — Heartify" description={'Just moderation in Islam.'} path="/moderation-ethics" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Content Moderation Ethics</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Just moderation in Islam.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
