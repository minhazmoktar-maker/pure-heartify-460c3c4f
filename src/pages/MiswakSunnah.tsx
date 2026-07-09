import { Link } from "react-router-dom";
import { ArrowLeft, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function MiswakSunnah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Miswāk — Prophetic Toothstick" description="Cleaning the mouth as an act of worship" path="/miswak-sunnah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Brush className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Miswāk — Prophetic Toothstick</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Merit</h2>
        <Card key="0-0" className="p-4"><div>'Miswāk purifies the mouth and pleases the Lord' — Nasā'ī 5.</div></Card>
        <h2 className="font-semibold pt-2">Times</h2>
        <Card key="1-0" className="p-4"><div>Before wuḍū, salāh, entering the home, and on waking.</div></Card>
      </div>
    </div>
  );
}
