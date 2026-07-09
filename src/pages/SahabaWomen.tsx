import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SahabaWomen() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Female Companions" description="Khadījah, ʿĀʾishah, Fāṭimah, Umm Salamah" path="/sahaba-women" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Female Companions</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Notable</h2>
        <Card key="0-0" className="p-4"><div>Khadījah — first believer.</div></Card><Card key="0-1" className="p-4"><div>ʿĀʾishah — narrated 2,210 aḥādīth.</div></Card><Card key="0-2" className="p-4"><div>Fāṭimah — chief of women of Paradise (Bukhari 3624).</div></Card>
      </div>
    </div>
  );
}
