import { Link } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Every ḥarām earning is unaccepted worship (Muslim 1015).",
  "Avoid ribā, gharar (excessive uncertainty), and maysir (gambling).",
  "Give sincere naṣīḥah in every trade (Bukhari 2079)."
];
const S1 = [
  "Budget by percentage: needs, ṣadaqah, savings, permissible spending.",
  "Emergency fund before non-essential spending (Sunnah of Yūsuf 12:47-48).",
  "Pay zakāh yearly on the lunar date wealth first reached niṣāb."
];
const S2 = [
  "Halal equities screened by AAOIFI (no ribā, alcohol, gambling, adult industry).",
  "Ṣukūk over conventional bonds.",
  "Islamic gold-backed savings (spot, hand-to-hand) — no leverage.",
  "Wasiyyah + written wealth plan (Bukhari 2738)."
];

export default function WealthManagement() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Wealth Management" description="Halal earning, budgeting, halal investing, debt avoidance, and the fiqh of financial planning." path="/wealth-management" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Wallet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Wealth Management</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Earning</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Planning</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Investing</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}