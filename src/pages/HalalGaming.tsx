import { Link } from "react-router-dom";
import { ArrowLeft, Joystick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['No music / shirk cutscenes.', 'Respect ṣalāh times.', 'Avoid gambling loot-boxes.', 'Community without ikhtilāṭ.'];

export default function HalalGaming() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Gaming Guidelines — Heartify" description={'Play without compromising dīn.'} path="/halal-gaming" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Joystick className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Gaming Guidelines</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Play without compromising dīn.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
