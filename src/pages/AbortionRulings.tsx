import { Link } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function AbortionRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Abortion Rulings" description="Sanctity of life" path="/abortion-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <AlertCircle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Abortion Rulings</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Fiqh</h2>
        <Card className="p-4"><div>Prohibited after ensoulment (120 days) except to save mother's life.</div></Card>
      </div>
    </div>
  );
}
