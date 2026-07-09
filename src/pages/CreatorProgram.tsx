import { Link } from "react-router-dom";
import { ArrowLeft, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Revenue share on halal ads only.', 'Editorial + fiqh review.', 'Studio grants for masājid.', "Da'wah mentorship."];

export default function CreatorProgram() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Creator Program — Heartify" description={'Support for practicing Muslim creators.'} path="/creator-program" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Video className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Creator Program</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Support for practicing Muslim creators.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
