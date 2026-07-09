import { Link } from "react-router-dom";
import { ArrowLeft, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Absence of water (Qur'an 5:6).",
  "Illness where water is harmful.",
  "Insufficient water for wuḍū/ghusl beyond drinking need.",
  "'The clean earth is the wuḍū of the Muslim, even for ten years' (Tirmidhi 124)."
];
const S1 = [
  "Intention (niyyah).",
  "Strike both palms once on clean earth or dust.",
  "Wipe the face once.",
  "Wipe the hands (majority: up to wrists; some: to elbows) — Bukhari 347.",
  "Valid for one fard prayer + as many nafl as one wishes (some scholars: until ḥadath)."
];

export default function Tayammum() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Tayammum — Dry Ablution" description="The concession when water is absent or harmful: purifying with clean earth." path="/tayammum" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Wind className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Tayammum</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">When</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}