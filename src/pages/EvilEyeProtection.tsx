import { Link } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function EvilEyeProtection() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Protection from Evil Eye" description="Adhkār and practical steps" path="/evil-eye-protection" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Eye className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Protection from Evil Eye</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Adhkār</h2>
        <Card key="0-0" className="p-4"><div>Al-Mu'awwidhāt after Fajr and Maghrib — Tirmidhī 3575.</div></Card>
        <Card key="0-1" className="p-4"><div>Saying 'mā shā' Allāh, tabārak Allāh' when admiring.</div></Card>
        <h2 className="font-semibold pt-2">If Struck</h2>
        <Card key="1-0" className="p-4"><div>Ghusl water from the one who caused it (Muwaṭṭa 1683).</div></Card>
        <Card key="1-1" className="p-4"><div>Ruqyah with Fātiḥah and Mu'awwidhāt.</div></Card>
      </div>
    </div>
  );
}
