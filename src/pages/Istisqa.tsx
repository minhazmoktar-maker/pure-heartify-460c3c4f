import { Link } from "react-router-dom";
import { ArrowLeft, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Announce a day; fast, give ṣadaqah, seek forgiveness beforehand.",
  "Go out to an open place, humble, without perfume.",
  "Two rak'ah like Eid (Abu Dawud 1165), then khuṭbah, abundant istighfār and du'ā.",
  "Imam faces qiblah, raises hands high, flips his cloak — a sign of hoping Allah changes the state (Bukhari 1005)."
];

export default function Istisqa() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣalāt al-Istisqā' — Prayer for Rain" description="The Prophetic prayer for rain in times of drought: two rak'ah, khuṭbah, du'ā, and flipping the cloak." path="/istisqa" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <CloudRain className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṣalāt al-Istisqā'</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">How</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}