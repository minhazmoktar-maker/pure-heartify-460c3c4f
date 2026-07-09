import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function HijraLessons() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Lessons from the Hijrah" description="Emigration of the Prophet ﷺ" path="/hijra-lessons" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Compass className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Lessons from the Hijrah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Key lessons</h2>
        <Card key="0-0" className="p-4"><div>Trust in Allāh (Q 9:40).</div></Card><Card key="0-1" className="p-4"><div>Careful planning aligned with tawakkul.</div></Card><Card key="0-2" className="p-4"><div>Sacrifice for the sake of dīn.</div></Card>
      </div>
    </div>
  );
}
