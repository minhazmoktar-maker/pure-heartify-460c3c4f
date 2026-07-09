import { Link } from "react-router-dom";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function VisitingSick() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Visiting the Sick" description="Reward and etiquette of 'iyādat al-marīḍ" path="/visiting-the-sick" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Stethoscope className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Visiting the Sick</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Reward</h2>
        <Card key="0-0" className="p-4"><div>70,000 angels ask forgiveness for the visitor until evening — Tirmidhī 969.</div></Card>
        <h2 className="font-semibold pt-2">Du'ā</h2>
        <Card key="1-0" className="p-4"><div>'As'alullāh al-'Azīm, Rabb al-'Arsh al-'Aẓīm, an yashfīk' — 7 times.</div></Card>
      </div>
    </div>
  );
}
