import { Link } from "react-router-dom";
import { ArrowLeft, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function HaydFiqh() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ḥayḍ — Menstruation Fiqh" description="Rulings for menstruation: prayer, fasting, Qur'an" path="/hayd-fiqh" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <CircleDot className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ḥayḍ — Menstruation Fiqh</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">During Ḥayḍ</h2>
        <Card key="0-0" className="p-4"><div>No ṣalāh (and it is not made up).</div></Card>
        <Card key="0-1" className="p-4"><div>No fasting (fasts are made up later).</div></Card>
        <Card key="0-2" className="p-4"><div>No ṭawāf and no intercourse (Qur'an 2:222).</div></Card>
        <h2 className="font-semibold pt-2">After</h2>
        <Card key="1-0" className="p-4"><div>Ghusl becomes obligatory when bleeding stops.</div></Card>
        <Card key="1-1" className="p-4"><div>Resume all acts of worship immediately.</div></Card>
      </div>
    </div>
  );
}
