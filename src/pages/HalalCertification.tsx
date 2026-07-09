import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Third-party audit of ingredients, supply chain, slaughter.', 'Trusted bodies: JAKIM (MY), MUI (ID), HFA (UK), IFANCA (US).', 'Look for verified logo; verify online registry.', 'Certifications expire — re-check annually.'];

export default function HalalCertification() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Certification — Heartify" description="Halal Certification: How it works." path="/halal-certification" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <BadgeCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Certification</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">How it works</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
