import { Link } from "react-router-dom";
import { ArrowLeft, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Ibn al-Qayyim: Zuhd is emptying the heart of dunyā, not the hand.",
  "'Be in the world as if a stranger or a traveler' (Bukhari 6416).",
  "Not rahbāniyyah (monasticism) — Islam has no monasticism (Ahmad 24011)."
];
const S1 = [
  "Not sad over what is missed, not overjoyed at what is gained (Qur'an 57:23).",
  "Simplicity in food, clothing, and home.",
  "Preferring the ākhirah in every choice.",
  "Ease in giving ṣadaqah."
];

export default function Zuhd() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Zuhd — Asceticism of the Heart" description="Not that you own nothing, but that nothing owns your heart. The Prophet ﷺ, Abu Bakr and 'Umar as models." path="/zuhd" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Leaf className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Zuhd</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Definition</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Signs</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}