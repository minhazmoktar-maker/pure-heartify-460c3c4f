import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function MajorSignsHour() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Major Signs of the Hour" description="The ten great signs before the Hour" path="/major-signs-hour" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <AlertTriangle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Major Signs of the Hour</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">The Ten</h2>
        <Card key="0-0" className="p-4"><div>Dajjāl, descent of 'Īsā ibn Maryam ﷺ, Ya'jūj & Ma'jūj, three landslides, smoke, sunrise from the west, beast of the earth, and a fire driving people — Muslim 2901.</div></Card>
      </div>
    </div>
  );
}
