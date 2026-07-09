import { Link } from "react-router-dom";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'In their wealth is a known right for the beggar and the deprived' (Qur'an 70:24-25).",
  "Zakāh — 2.5% yearly on wealth over niṣāb.",
  "Zakāt al-fiṭr — one ṣā' of food per person, before Eid ṣalāh."
];
const S1 = [
  "Feeding the hungry when found (Muslim 42 — best Islam).",
  "Emergency ṣadaqah becomes fard on the wealthy if someone will die of hunger.",
  "Never shame or count favors on the poor (Qur'an 2:264)."
];

export default function RightsOfPoor() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Rights of the Poor" description="Zakāh, obligatory ṣadaqah in emergencies, feeding the hungry, and the ḥaqq of the needy in your wealth." path="/rights-of-poor" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <HeartHandshake className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Rights of the Poor</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Obligations</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Beyond zakāh</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}