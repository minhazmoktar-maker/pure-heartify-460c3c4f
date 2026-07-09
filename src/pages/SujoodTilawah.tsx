import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Sunnah mu'akkadah for the reciter and the intentional listener (Bukhari 1077).",
  "Not for one who merely overhears without listening.",
  "No wuḍū or qiblah is required by the majority for outside-ṣalāh sajdah — though it is more virtuous."
];
const S1 = [
  "Takbīr, one prostration, then sit and give salām (some say no salām needed for outside ṣalāh).",
  "Du'ā: 'Sajada wajhī li-l-ladhī khalaqahu wa shaqqa sam'ahu wa baṣarahu bi-ḥawlihi wa quwwatih' (Tirmidhi 580).",
  "15 mashhūr sajdah verses across the Qur'an — printed in every muṣḥaf."
];

export default function SujoodTilawah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sujūd at-Tilāwah — Prostration of Recitation" description="The 15 sajdah verses in the Qur'an, how to prostrate, the du'ā, and the rulings for reciter and listener." path="/sujood-tilawah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sujūd at-Tilāwah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rulings</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}