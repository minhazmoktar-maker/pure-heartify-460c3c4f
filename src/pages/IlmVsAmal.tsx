import { Link } from "react-router-dom";
import { ArrowLeft, BookCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Qur'an 61:2-3 — 'Why do you say what you do not do? Great is the hatred with Allah…'",
  "'The most severely punished on Yawm al-Qiyāmah is the scholar who did not benefit from his knowledge' (al-Bayhaqī, Shu'ab).",
  "'Ilm calls out to 'amal; if 'amal answers, it stays — else it leaves (al-Khaṭīb)."
];
const S1 = [
  "One verse learned = one act to change today.",
  "Teach what you learn — 'convey from me, even one verse' (Bukhari 3461).",
  "Sincerity: fear knowledge that puffs you up more than the ignorance that humbled you."
];

export default function IlmVsAmal() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="'Ilm & 'Amal — Knowledge and Action" description="Knowledge without action is a plant without fruit. The obligation to act on what you learn." path="/ilm-amal" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <BookCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">'Ilm & 'Amal</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Warnings</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How to act</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}