import { Link } from "react-router-dom";
import { ArrowLeft, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function NajasahImpurities() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Najāsah — Impurities & Cleansing" description="Types of impurities and how to cleanse them" path="/najasah-impurities" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Droplet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Najāsah — Impurities & Cleansing</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Categories</h2>
        <Card key="0-0" className="p-4"><div>Mughallaẓah (heavy) — dog/pig saliva.</div></Card>
        <Card key="0-1" className="p-4"><div>Mukhaffafah (light) — urine of male infant on milk only.</div></Card>
        <Card key="0-2" className="p-4"><div>Mutawassiṭah (medium) — most bodily fluids, blood, wine.</div></Card>
        <h2 className="font-semibold pt-2">Cleansing</h2>
        <Card key="1-0" className="p-4"><div>Wash until color, smell, and taste of the najāsah are gone.</div></Card>
        <Card key="1-1" className="p-4"><div>Seven washes (one with earth) for dog saliva — Muslim 279.</div></Card>
        <Card key="1-2" className="p-4"><div>Sprinkling water suffices for light impurity of the male infant.</div></Card>
      </div>
    </div>
  );
}
