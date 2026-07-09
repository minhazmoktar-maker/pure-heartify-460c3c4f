import { Link } from "react-router-dom";
import { ArrowLeft, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Access to ḥalāl food and prayer facilities.', "Qiblah direction; short/join prayers while traveling (Qur'an 4:101).", 'Modest destinations; family-friendly.', 'Avoid ḥarām-centric locations (casino cities).'];

export default function HalalTravel() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Travel — Heartify" description="Halal Travel: Muslim-friendly travel." path="/halal-travel" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Plane className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Travel</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Muslim-friendly travel</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
