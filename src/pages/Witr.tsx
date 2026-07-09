import { Link } from "react-router-dom";
import { ArrowLeft, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Sunnah mu'akkadah (majority); wājib (Ḥanafī).",
  "Time: after 'Ishā' until Fajr (Muslim 754).",
  "Number: 1, 3, 5, 7, 9, or 11 rak'ah.",
  "'Do not pray two witrs in one night' (Abu Dawud 1439)."
];
const S1 = [
  "Allāhumma-hdinī fīman hadayt, wa 'āfinī fīman 'āfayt… (Tirmidhi 464 — taught by the Prophet ﷺ to al-Ḥasan).",
  "In Ramadan witr, du'ā al-qunūt is Sunnah in the last half (some say all month)."
];

export default function Witr() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Witr — The Odd Prayer" description="'Allah is Witr and loves the witr' — the sunnah mu'akkadah that seals the night." path="/witr" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Moon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Witr</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rulings</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Du'ā al-qunūt</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}