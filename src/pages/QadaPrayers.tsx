import { Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'Whoever sleeps through or forgets a prayer, let him pray it when he remembers' (Bukhari 597).",
  "Missing prayer intentionally is a grave sin (Muslim 82) — tawbah + qaḍā' by the majority.",
  "Order (tartīb) is required by Ḥanafī, Mālikī, Ḥanbalī if remembered and few in number."
];
const S1 = [
  "Pray each missed ṣalāh in the same manner (2, 3, or 4 rak'ah), audible or silent as its origin.",
  "Recite iqāmah before each if praying multiple.",
  "Priority order: current fard first if time is running out, then qaḍā' (Bukhari 596 — Battle of Khandaq)."
];

export default function QadaPrayers() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Qaḍā' — Making Up Missed Prayers" description="The obligation of making up prayers missed by sleep, forgetfulness, or neglect — order, method, and warnings." path="/qada-prayers" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Qaḍā' — Making Up Missed Prayers</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Foundations</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Method</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}