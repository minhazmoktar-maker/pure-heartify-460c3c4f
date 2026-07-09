import { Link } from "react-router-dom";
import { ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Human oversight of fatwa.', 'No image-of-Prophets generation.', 'Prevent deceptive deepfakes.', 'Use AI for good (dawah, translation).'];

export default function AIInIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="AI in Islam — Heartify" description={'Ethical & fiqh perspectives on AI.'} path="/ai-in-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Cpu className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">AI in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Ethical & fiqh perspectives on AI.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
