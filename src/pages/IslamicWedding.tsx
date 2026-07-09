import { Link } from "react-router-dom";
import { ArrowLeft, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Simple mahr — the most blessed nikāh is the easiest (Ahmad 24595).', 'Announce publicly; duff for women permitted.', 'Walīmah after consummation (Bukhari 5170).', 'Avoid extravagance, mixed dancing, music.'];

export default function IslamicWedding() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Wedding — Heartify" description="Islamic Wedding: Sunnah." path="/islamic-wedding" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Cake className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Wedding</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Sunnah</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
