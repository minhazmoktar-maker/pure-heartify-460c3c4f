import { Link } from "react-router-dom";
import { ArrowLeft, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Match hosts with guests.', 'Prioritize new Muslims & travelers.', 'Avoid excessive food waste.', 'Include duʿāʾ at maghrib.'];

export default function IftarApps() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ramadan Iftar Apps — Heartify" description={'Communal iftar coordination.'} path="/iftar-apps" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Utensils className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ramadan Iftar Apps</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Communal iftar coordination.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
