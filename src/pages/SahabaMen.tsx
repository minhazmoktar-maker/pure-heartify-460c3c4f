import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SahabaMen() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Male Companions" description="The ten promised Paradise" path="/sahaba-men" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Male Companions</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Al-ʿAsharah al-Mubashsharah</h2>
        <Card key="0-0" className="p-4"><div>Abū Bakr, ʿUmar, ʿUthmān, ʿAlī, Ṭalḥah, Zubayr, ʿAbd al-Raḥmān ibn ʿAwf, Saʿd, Saʿīd, Abū ʿUbaydah (Tirmidhi 3747).</div></Card>
      </div>
    </div>
  );
}
