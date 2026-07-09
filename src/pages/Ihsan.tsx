import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'That you worship Allah as if you see Him, and if you do not see Him, then indeed He sees you' (Muslim 8).",
  "The third level after Islām (submission) and Īmān (belief)."
];
const S1 = [
  "Khushū' in ṣalāh.",
  "Truthfulness in speech and dealings.",
  "Iḥsān toward parents (Qur'an 17:23), spouse, neighbor, animals.",
  "Iḥsān in slaughter — sharpen the blade (Muslim 1955)."
];

export default function Ihsan() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Iḥsān — Worshipping Allah as if You See Him" description="The highest station of the dīn as defined in the Ḥadīth of Jibrīl — presence, sincerity, and beautification of deeds." path="/ihsan" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Iḥsān</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Definition</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Fruits</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}