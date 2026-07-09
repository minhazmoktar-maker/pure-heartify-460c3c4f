import { Link } from "react-router-dom";
import { ArrowLeft, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'He is not one of us who does not have mercy on our young and honor our elders' (Tirmidhi 1919).",
  "Elders speak first — start with the eldest (Bukhari 3173).",
  "Serve them in gathering, imāmate, and travel."
];
const S1 = [
  "Stand when a virtuous elder enters (Bukhari 3804 — Sa'd).",
  "Never sit above a parent or a scholar without permission.",
  "Care for elderly parents is a means to Jannah (Muslim 2551)."
];

export default function EldersRights() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Rights of Elders" description="'He is not one of us who does not honor our elders' — the Prophetic obligation of respect and care." path="/elders-rights" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <UserCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Rights of Elders</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Command</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Practice</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}