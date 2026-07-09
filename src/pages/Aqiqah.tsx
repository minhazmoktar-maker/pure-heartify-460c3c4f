import { Link } from "react-router-dom";
import { ArrowLeft, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Sunnah mu'akkadah on the 7th day after birth (Abu Dawud 2837).",
  "Two comparable sheep for a boy, one for a girl (Tirmidhi 1513).",
  "If missed on 7th — then 14th, then 21st (Bayhaqī).",
  "Meat is distributed like the udhiyah — family, relatives, poor."
];
const S1 = [
  "Give the child a good name (Abu Dawud 4948).",
  "Shave the head; give silver equal to the weight of the hair as ṣadaqah (Tirmidhi 1519).",
  "Adhān in the newborn's ear is weak; not established as Sunnah by all scholars."
];

export default function Aqiqah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="'Aqīqah — The Newborn Sunnah" description="The Sunnah slaughter for a newborn on the 7th day: two sheep for a boy, one for a girl; naming, shaving, ṣadaqah of the weight in silver." path="/aqiqah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Baby className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">'Aqīqah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rulings</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Same day</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}