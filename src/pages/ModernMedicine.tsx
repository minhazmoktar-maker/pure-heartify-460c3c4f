import { Link } from "react-router-dom";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function ModernMedicine() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Medical Fiqh" description="Necessity rules" path="/modern-medicine" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Stethoscope className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Medical Fiqh</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Principle</h2>
        <Card className="p-4"><div>Necessity permits the forbidden in measured proportion (qawāʿid).</div></Card>
      </div>
    </div>
  );
}
