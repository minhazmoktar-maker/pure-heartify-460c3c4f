import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Sponsor housing & education.', "Teach Qur'an & language.", 'Employment pathways.', 'Long-term integration.'];

export default function RefugeeSupport() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Refugee Support in Islam — Heartify" description={'Muhājirīn support as a sunnah.'} path="/refugee-support" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Home className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Refugee Support in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Muhājirīn support as a sunnah.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
