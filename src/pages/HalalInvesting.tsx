import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Business screen: no ribā-based finance, alcohol, pork, gambling, adult industry, conventional insurance, weapons of mass harm.",
  "Financial screens: debt / market cap < 33%, cash+ribā-securities / market cap < 33%, ribā income / total revenue < 5%.",
  "Purify (donate) the small ḥarām portion of dividends — no personal benefit."
];
const S1 = [
  "Ṣukūk — asset-backed, not debt-based like bonds.",
  "Physical gold/silver — spot settlement, no leverage or margin (Muslim 1587).",
  "Islamic mutual funds and ETFs (Sharī'ah-certified).",
  "Real estate — direct or via halal REITs."
];
const S2 = [
  "Conventional bonds, CDs, savings interest.",
  "Forex margin trading, most crypto derivatives.",
  "Conventional insurance — use takāful.",
  "Any product paying or charging ribā, however dressed."
];

export default function HalalInvesting() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal Investing — Screens & Instruments" description="AAOIFI screens for equities, ṣukūk vs bonds, gold and silver rulings, and avoiding ribā-based products." path="/halal-investing" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <TrendingUp className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal Investing</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">AAOIFI equity screens</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Instruments</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Avoid</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}