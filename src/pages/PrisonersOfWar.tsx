import { Link } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Feed them from your own food (Qur'an 76:8-9).", "Options: pardon, ransom, or exchange (Qur'an 47:4).", 'No torture; dignity preserved.', 'Prophet ﷺ freed Badr captives who taught Muslims to read.'];

export default function PrisonersOfWar() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Prisoners of War — Heartify" description="Prisoners of War: Islamic law." path="/prisoners-of-war" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Lock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Prisoners of War</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Islamic law</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
