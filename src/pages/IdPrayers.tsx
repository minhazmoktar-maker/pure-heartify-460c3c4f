import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Ghusl, best clothes, 'iṭr (Ibn Mājah 1315).",
  "Eat odd dates before Fiṭr (Bukhari 953); eat after ṣalāh on Aḍḥā (Tirmidhi 542).",
  "Walk to the muṣallā by one route, return by another (Bukhari 986).",
  "Takbīr aloud from home to muṣallā."
];
const S1 = [
  "Two rak'ah before the khuṭbah, with 7 takbīrāt in the 1st and 5 in the 2nd (Abu Dawud 1149).",
  "No adhān or iqāmah (Muslim 887).",
  "Khuṭbah after the ṣalāh — attendance recommended."
];

export default function IdPrayers() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣalāt al-'Īdayn — Eid Prayers" description="Rulings and Sunnah practices of Eid al-Fiṭr and Eid al-Aḍḥā, from ghusl to takbīrāt." path="/eid-prayers" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Star className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Eid Prayers</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Sunnahs of the day</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">The prayer</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}