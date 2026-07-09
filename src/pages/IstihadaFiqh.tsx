import { Link } from "react-router-dom";
import { ArrowLeft, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function IstihadaFiqh() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Istiḥāḍah — Irregular Bleeding" description="Continuous bleeding outside ḥayḍ and how to worship" path="/istihada-fiqh" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Waves className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Istiḥāḍah — Irregular Bleeding</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Identification</h2>
        <Card key="0-0" className="p-4"><div>Blood outside normal ḥayḍ pattern or after max duration.</div></Card>
        <Card key="0-1" className="p-4"><div>Distinguished by color, smell, and habit.</div></Card>
        <h2 className="font-semibold pt-2">Worship</h2>
        <Card key="1-0" className="p-4"><div>Perform wuḍū for each prayer (Bukhari 306).</div></Card>
        <Card key="1-1" className="p-4"><div>Pray, fast, and have relations normally.</div></Card>
      </div>
    </div>
  );
}
