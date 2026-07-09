import { Link } from "react-router-dom";
import { ArrowLeft, HandHelping } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["'I and the guardian of an orphan will be like this in Jannah' — two fingers together (Bukhari 5304).", "Guard their wealth (Qur'an 4:10).", 'Preserve their dignity; educate & love them.', 'Structured programs (Islamic Relief, Muslim Aid) support globally.'];

export default function OrphanCare() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Care of Orphans — Heartify" description="Care of Orphans: Reward." path="/orphan-care" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <HandHelping className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Care of Orphans</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Reward</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
