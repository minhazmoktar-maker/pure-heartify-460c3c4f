import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const MUH = [
  { v: "The best fast after Ramadan is the month of Allah — Muḥarram.", ref: "Muslim 1163" },
  { v: "It contains a day on which Allah saved Mūsā and his people, and drowned Fir'awn — 'Āshūrā' (the 10th).", ref: "Bukhari 2004; Muslim 1130" },
  { v: "Fasting the Day of 'Āshūrā' — I hope from Allah that it expiates the sins of the previous year.", ref: "Muslim 1162" },
  { v: "Fast a day before or after it (the 9th & 10th) to differ from the People of the Book.", ref: "Muslim 1134" },
];
const HOW = [
  "Best: fast both the 9th and 10th of Muḥarram (Tāsū'ā' & 'Āshūrā')",
  "Acceptable: fast only the 10th",
  "Also virtuous: fast the 10th and 11th if the 9th was missed",
  "Give ṣadaqah, be generous to family — the Sunnah of 'Āshūrā' generosity",
  "Avoid the innovation of self-harm, matam, or lamentation — foreign to the Sunnah",
];

export default function Ashura() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muḥarram & 'Āshūrā' — Virtues, Fasting, and Sunnah" description="The sacred month of Muḥarram and the Day of 'Āshūrā' (10th): fasting virtues, historical significance, and the proper Sunnah observance." path="/ashura" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><CalendarDays className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Muḥarram & 'Āshūrā'</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Evidences</h2>
        {MUH.map((v, i) => (<Card key={i} className="p-4"><div>{v.v}</div><div className="text-xs text-muted-foreground mt-1">{v.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">How to Observe</h2>
        {HOW.map((h, i) => (<Card key={i} className="p-4"><div>{i + 1}. {h}</div></Card>))}
      </div>
    </div>
  );
}
