import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function WorkplaceEthics() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Workplace Ethics" description="Halal earnings" path="/workplace-ethics" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Briefcase className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Workplace Ethics</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Principles</h2>
        <Card className="p-4"><div>Honesty, punctuality, ihsan; fulfil contracts (Q 5:1).</div></Card>
      </div>
    </div>
  );
}
