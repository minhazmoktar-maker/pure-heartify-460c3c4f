import { Link } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function AddictionRecovery() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Addiction Recovery" description="Tawbah + means" path="/addiction-recovery" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Activity className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Addiction Recovery</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Steps</h2>
        <Card className="p-4"><div>Every intoxicant is ḥarām; combine tawbah, community, therapy.</div></Card>
      </div>
    </div>
  );
}
