import { Link } from "react-router-dom";
import { ArrowLeft, Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function AngelsInIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="The Angels of Allah" description="Jibrīl, Mīkā'īl, Isrāfīl, and their roles" path="/angels-in-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Feather className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">The Angels of Allah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Attributes</h2>
        <Card key="0-0" className="p-4"><div>Created from light, never disobey Allah (Qur'an 66:6).</div></Card>
        <h2 className="font-semibold pt-2">Notable</h2>
        <Card key="1-0" className="p-4"><div>Jibrīl — revelation. Mīkā'īl — rain & sustenance. Isrāfīl — the Trumpet. Malak al-Mawt — death.</div></Card>
      </div>
    </div>
  );
}
