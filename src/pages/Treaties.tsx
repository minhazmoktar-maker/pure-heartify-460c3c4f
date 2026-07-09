import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["'Fulfill every covenant' (Qur'an 17:34).", 'Breaking treaties — sign of hypocrisy (Bukhari 34).', 'Treaty of Ḥudaybiyyah — model of patience.', 'Applies to visas, employment, all contracts.'];

export default function Treaties() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Treaties & Contracts — Heartify" description="Treaties & Contracts: Sanctity." path="/treaties" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Treaties & Contracts</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Sanctity</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
