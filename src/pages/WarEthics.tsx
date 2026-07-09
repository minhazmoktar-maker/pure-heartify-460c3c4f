import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['No killing women, children, elderly, monks (Abu Dawud 2614).', 'No mutilation, no burning, no destroying crops (Muwatta 21.10).', "Prisoners treated humanely (Qur'an 76:8).", "Peace treaties honored (Qur'an 8:61)."];

export default function WarEthics() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ethics of War — Heartify" description="Ethics of War: Islamic rules." path="/war-ethics" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ethics of War</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Islamic rules</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
