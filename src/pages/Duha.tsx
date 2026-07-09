import { Link } from "react-router-dom";
import { ArrowLeft, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'Every morning there is charity due upon every joint — two rak'ah of Ḍuḥā suffice for all of that' (Muslim 720).",
  "Abu Hurayrah, Abū Dharr and Abū-d-Dardā' were advised never to leave it (Bukhari 1981).",
  "Reward equal to 'umrah when combined with sitting until Ḍuḥā after Fajr (Tirmidhi 586)."
];
const S1 = [
  "Time: from ~15 minutes after sunrise until ~15 minutes before Ẓuhr.",
  "Best time: when the sun's heat intensifies (Muslim 748).",
  "2 to 8 rak'ah in pairs; some scholars up to 12."
];

export default function Duha() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣalāt aḍ-Ḍuḥā — The Forenoon Prayer" description="The prayer of the awwābīn — 2 to 8 rak'ah between sunrise + 15 min and Ẓuhr, sufficient charity for every joint." path="/duha" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sun className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṣalāt aḍ-Ḍuḥā</h1>
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