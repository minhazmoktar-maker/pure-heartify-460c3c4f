import { Link } from "react-router-dom";
import { ArrowLeft, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Verified shuyūkh only.', 'Chat filtered for adab.', 'Multi-language subtitles.', "Q&A queue with priority to sisters' room."];

export default function LiveHalaqat() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Live Halaqāt — Heartify" description={'Streamed circles with moderation.'} path="/live-halaqat" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Radio className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Live Halaqāt</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Streamed circles with moderation.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
