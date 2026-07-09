import { Link } from "react-router-dom";
import { ArrowLeft, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["'He is not of us who calls to ʿaṣabiyyah' (Abu Dawud 5121).", "Ummah bound by īmān, not ethnicity (Qur'an 49:13).", 'Love of homeland permitted; supremacism forbidden.', 'Prophet ﷺ warned against tribalism at Farewell Sermon.'];

export default function NationalismIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Nationalism in Islam — Heartify" description="Nationalism in Islam: Ruling." path="/nationalism-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Flag className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Nationalism in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Ruling</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
