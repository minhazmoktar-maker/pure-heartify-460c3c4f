import { Link } from "react-router-dom";
import { ArrowLeft, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SunnahOfEating() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sunnah of Eating" description="Bismillah, right hand, three fingers" path="/sunnah-of-eating" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Utensils className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sunnah of Eating</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Adab</h2>
        <Card key="0-0" className="p-4"><div>Say Bismillāh; eat with the right hand (Muslim 2020).</div></Card><Card key="0-1" className="p-4"><div>Eat from what is nearest to you (Bukhari 5376).</div></Card><Card key="0-2" className="p-4"><div>Do not blow into food or drink (Tirmidhi 1888).</div></Card>
        <h2 className="font-semibold pt-2">Gratitude</h2>
        <Card key="1-0" className="p-4"><div>Say Al-ḥamdulillāh upon finishing; sit while drinking.</div></Card>
      </div>
    </div>
  );
}
