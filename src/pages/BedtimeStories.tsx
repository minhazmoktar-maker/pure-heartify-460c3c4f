import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Prophets' lives simplified.", 'Ṣaḥābah adventures.', 'End with a duʿāʾ.', 'Avoid fabricated tales.'];

export default function BedtimeStories() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Bedtime Stories — Heartify" description={'Prophetic-era stories for children.'} path="/islamic-bedtime-stories" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Bedtime Stories</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Prophetic-era stories for children.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
