import { Link } from "react-router-dom";
import { ArrowLeft, Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Jihād an-nafs: struggle against desires (greater jihad, per weak narration but true meaning).', "Jihād ash-Shayṭān: fighting Satan's whispers.", 'Jihād bil-lisān/mal: with tongue & wealth (dawah, ṣadaqah).', 'Jihād bis-sayf: only under legitimate authority, strict ethics.'];

export default function JihadTypes() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Types of Jihād — Heartify" description="Types of Jihād: Categories." path="/jihad-types" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sword className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Types of Jihād</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Categories</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
