import { Link } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Addition — an extra rak'ah, sujūd, or rukū' (Bukhari 401).",
  "Omission — leaving a wājib such as first tashahhud (Bukhari 829).",
  "Doubt — uncertain whether you prayed 3 or 4 rak'ah (Muslim 571)."
];
const S1 = [
  "Two sujūd like normal sujūd.",
  "Before salām — if the cause is omission of wājib or doubt with likely answer (Bukhari 1229).",
  "After salām — if the cause is addition or doubt without a leaning (Muslim 574)."
];

export default function SujoodSahw() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sujūd as-Sahw — Prostration of Forgetfulness" description="When and how to make sujūd as-sahw for additions, omissions, or doubts in ṣalāh." path="/sujood-sahw" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <AlertCircle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sujūd as-Sahw</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Causes</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}