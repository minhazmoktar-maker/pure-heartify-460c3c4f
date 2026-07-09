import { Link } from "react-router-dom";
import { ArrowLeft, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SunnahOfGreeting() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sunnah of Greeting" description="As-salāmu ʿalaykum" path="/sunnah-of-greeting" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Handshake className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sunnah of Greeting</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rules</h2>
        <Card key="0-0" className="p-4"><div>Initiate salām first — the best of you (Bukhari 6234).</div></Card><Card key="0-1" className="p-4"><div>Return greeting equal or better (Q 4:86).</div></Card>
      </div>
    </div>
  );
}
