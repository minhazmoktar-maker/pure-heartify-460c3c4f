import { Link } from "react-router-dom";
import { ArrowLeft, CircleSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "From Fajr until the sun rises fully (~15 min above horizon).",
  "When the sun is at its zenith until it declines (a few minutes at midday).",
  "From 'Aṣr until Maghrib (Muslim 831; Bukhari 586)."
];
const S1 = [
  "Prayers with a cause: taḥiyyat al-masjid, sunnah of wuḍū, sunnah of ṭawāf, funeral prayer (all times except the three moments of sun-rise/zenith/set).",
  "Making up a missed fard when remembered (Bukhari 597).",
  "At Masjid al-Ḥarām — no time is forbidden (Tirmidhi 868)."
];

export default function ForbiddenTimes() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Times When Nafl Prayer is Forbidden" description="Three times the Prophet ﷺ forbade voluntary prayer, and the exceptions with a valid reason." path="/forbidden-prayer-times" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <CircleSlash className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Forbidden Times for Nafl</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Times</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Exceptions</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}