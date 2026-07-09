import { Link } from "react-router-dom";
import { ArrowLeft, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Imams as first responders — refer to specialists.', "Combine ruqyah, du'ā', therapy, medication.", "'Take medicine — Allah has not sent a disease without a cure' (Abu Dawud 3855).", 'Reduce stigma in community.'];

export default function MentalHealthImams() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Imams & Mental Health — Heartify" description="Imams & Mental Health: Bridging." path="/imam-mental-health" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Imams & Mental Health</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Bridging</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
