import { Link } from "react-router-dom";
import { ArrowLeft, Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function AsmaWaSifat() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Names & Attributes" description="Affirmation without taḥrīf" path="/asma-wa-sifat" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Feather className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Names & Attributes</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rule</h2>
        <Card key="0-0" className="p-4"><div>Affirm what Allāh affirmed for Himself, without taʿṭīl, tashbīh, takyīf, or tamthīl (Q 42:11).</div></Card>
      </div>
    </div>
  );
}
