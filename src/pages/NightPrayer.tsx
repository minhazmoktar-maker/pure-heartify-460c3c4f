import { Link } from "react-router-dom";
import { ArrowLeft, MoonStar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Qur'an 17:79 — 'A voluntary act for you; it may be that your Lord will raise you to a station of praise.'",
  "'Our Lord descends to the lowest heaven in the last third of the night, saying: Who is calling Me? I answer him.' (Bukhari 1145).",
  "'The best prayer after the obligatory is the night prayer' (Muslim 1163)."
];
const S1 = [
  "Sleep with wuḍū; intend to rise.",
  "Any number of rak'ah in pairs, ending with witr — the Prophet ﷺ prayed 11 or 13 (Bukhari 1147).",
  "Use miswāk on rising (Bukhari 245); recite the last 10 āyāt of Āl 'Imrān (Bukhari 4569)."
];

export default function NightPrayer() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Tahajjud & Qiyām al-Layl" description="The honor of the believer — praying in the last third of the night when the Lord descends to the lowest heaven." path="/tahajjud" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <MoonStar className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Tahajjud</h1>
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