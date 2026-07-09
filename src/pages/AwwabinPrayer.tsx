import { Link } from "react-router-dom";
import { ArrowLeft, Sunset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'Whoever prays six rak'ah after Maghrib, not speaking evil between them, they equal twelve years of worship' (Tirmidhi 435 — daʿīf but its meaning is supported).",
  "'The prayer of the awwābīn is when the young camels' feet burn' — for Ḍuḥā (Muslim 748); some scholars include this after Maghrib as well."
];
const S1 = [
  "Six rak'ah after the two Sunnah of Maghrib, before 'Ishā'.",
  "Pair by pair (2+2+2) with tashahhud.",
  "Combine with I'tikāf-like sitting for dhikr in between."
];

export default function AwwabinPrayer() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣalāt al-Awwābīn — Between Maghrib and 'Ishā'" description="Six rak'ah after Maghrib, equal to twelve years of worship — the prayer of those who turn in repentance." path="/awwabin" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sunset className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṣalāt al-Awwābīn</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Virtue</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}