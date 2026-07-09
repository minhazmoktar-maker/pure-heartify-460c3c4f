import { Link } from "react-router-dom";
import { ArrowLeft, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Battlefield martyrs — special ranks (Qur'an 3:169-170).", 'Also: drowning, plague, fire, childbirth, defending property (Muslim 1914).', 'Sins forgiven except debt (Muslim 1886).', 'Not sought recklessly; not suicide.'];

export default function MartyrdomVirtues() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Virtues of Shahādah — Heartify" description="Virtues of Shahādah: Types & rewards." path="/martyrdom" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Award className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Virtues of Shahādah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Types & rewards</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
