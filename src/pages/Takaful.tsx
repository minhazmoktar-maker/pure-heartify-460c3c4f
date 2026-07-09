import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Members contribute to shared pool — mutual assistance.', 'No ribā, no gharar, no maysir.', 'Surplus returned to members.', 'Family (life) and general (property) takāful available.'];

export default function Takaful() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Takāful (Islamic Insurance) — Heartify" description="Takāful (Islamic Insurance): Model." path="/takaful" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Takāful (Islamic Insurance)</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Model</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
