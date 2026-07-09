import { Link } from "react-router-dom";
import { ArrowLeft, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Put on socks while in a state of wuḍū (Bukhari 206).",
  "Socks cover the ankles and are thick enough not to fall off.",
  "Only for minor ḥadath — janābah requires ghusl (removal)."
];
const S1 = [
  "Resident: one day and one night (24 hours).",
  "Traveler: three days and three nights (72 hours) (Muslim 276).",
  "Starts from the first wipe after ḥadath, not from putting them on (majority)."
];
const S2 = [
  "Wipe the top of the foot once with wet fingers, from toes toward the shin.",
  "No wiping of the sole (Abu Dawud 162)."
];

export default function MashKhuffain() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Masḥ 'ala-l-Khuffain — Wiping over Socks" description="The Sunnah concession of wiping over leather socks / khuffs — conditions, duration for resident and traveler." path="/mash-khuffain" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Footprints className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Masḥ 'ala-l-Khuffain</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Conditions</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Duration</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}