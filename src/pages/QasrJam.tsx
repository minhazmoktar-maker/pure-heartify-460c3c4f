import { Link } from "react-router-dom";
import { ArrowLeft, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'Alms of Allah, accept His alms' — 'Umar on qaṣr (Muslim 686).",
  "Distance: majority ~ 48 mīl (~80 km); Ḥanafī require intent + distance.",
  "Duration: majority allow qaṣr until intent to reside >4 days (Ḥanbalī/Shāfi'ī) or 15 days (Ḥanafī).",
  "Only Ẓuhr, 'Aṣr, and 'Ishā' are shortened. Fajr and Maghrib remain."
];
const S1 = [
  "Jam' taqdīm — combine 'Aṣr with Ẓuhr in Ẓuhr's time.",
  "Jam' ta'khīr — delay Ẓuhr into 'Aṣr's time. Same for Maghrib–'Ishā'.",
  "Permitted for travel (Bukhari 1108), rain, illness, ḥajj (at 'Arafah and Muzdalifah).",
  "Fajr is never combined."
];

export default function QasrJam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Qaṣr & Jam' — Prayer of the Traveler" description="Shortening 4-rak'ah prayers to 2, and combining Ẓuhr–'Aṣr or Maghrib–'Ishā' on a journey." path="/qasr-jam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Route className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Qaṣr & Jam' — Traveler's Prayer</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Qaṣr</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Jam'</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}