import { Link } from "react-router-dom";
import { ArrowLeft, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Justice ('adl) is the foundation (Qur'an 4:58).", "Shūrā (consultation) is commanded (Qur'an 42:38).", 'Rulers accountable; obedience in maʿrūf only (Bukhari 7144).', 'No rebellion against Muslim ruler unless clear kufr (Bukhari 7056).'];

export default function PoliticalIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Politics in Islam — Heartify" description="Politics in Islam: Principles." path="/political-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Landmark className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Politics in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Principles</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
