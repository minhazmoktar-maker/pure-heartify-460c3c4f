import { Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function AdabOfMasjid() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Adab of the Masjid" description="Etiquette when entering and inside the mosque" path="/adab-of-masjid" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Building2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Adab of the Masjid</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Entering</h2>
        <Card key="0-0" className="p-4"><div>Right foot first, du'ā 'Allāhumma iftaḥ lī abwāba raḥmatik'.</div></Card>
        <Card key="0-1" className="p-4"><div>Two rak'ahs of Taḥiyyat al-Masjid before sitting.</div></Card>
        <h2 className="font-semibold pt-2">Inside</h2>
        <Card key="1-0" className="p-4"><div>No worldly business (Muslim 568).</div></Card>
        <Card key="1-1" className="p-4"><div>Silence phones; keep voices low.</div></Card>
      </div>
    </div>
  );
}
