import { Link } from "react-router-dom";
import { ArrowLeft, Bed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SunnahOfSleep() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sunnah of Sleep" description="Prophetic bedtime routine" path="/sunnah-of-sleep" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Bed className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sunnah of Sleep</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Before Sleep</h2>
        <Card key="0-0" className="p-4"><div>Wuḍū, dust the bed, sleep on right side, Āyat al-Kursī, last two verses of al-Baqarah, three Quls with wiping.</div></Card>
        <h2 className="font-semibold pt-2">On Waking</h2>
        <Card key="1-0" className="p-4"><div>'Alḥamdulillāh alladhī aḥyānā…' (Bukhari 6324).</div></Card>
      </div>
    </div>
  );
}
