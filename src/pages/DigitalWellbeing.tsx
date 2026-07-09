import { Link } from "react-router-dom";
import { ArrowLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Phone-free ṣalāh times.', 'Screen-limits after ʿIshāʾ.', 'Curate feeds intentionally.', 'Sabbath-like Fridays.'];

export default function DigitalWellbeing() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Digital Wellbeing for Muslims — Heartify" description={'Balancing tech with taqwā.'} path="/digital-wellbeing" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Smartphone className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Digital Wellbeing for Muslims</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Balancing tech with taqwā.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
