import { Link } from "react-router-dom";
import { ArrowLeft, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Majority: instrumental music impermissible (Bukhari 5590).', 'Duff allowed on ʿEid, weddings for women (Ibn Majah 1897).', 'Nasheeds without instruments broadly permitted.', 'Avoid what distracts from dhikr and prayer.'];

export default function MusicRulings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Music in Islam — Heartify" description="Music in Islam: Scholarly views." path="/music-rulings" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Music2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Music in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Scholarly views</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
