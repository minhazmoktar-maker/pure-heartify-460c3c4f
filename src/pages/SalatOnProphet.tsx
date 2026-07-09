import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Qur'an 33:56 — 'Allah and His angels send ṣalāh upon the Prophet — O you who believe, send ṣalāh upon him.'",
  "'Whoever sends ṣalāh on me once, Allah sends ṣalāh on him ten times, erases ten sins, and raises him ten degrees' (Nasa'i 1297).",
  "On Friday: 'Send abundant ṣalāh on me on Friday — your ṣalāh is presented to me' (Abu Dawud 1047)."
];
const S1 = [
  "Allāhumma ṣalli 'alā Muḥammad wa 'alā āli Muḥammad, kamā ṣallayta 'alā Ibrāhīm wa 'alā āli Ibrāhīm, innaka ḥamīdun majīd. Allāhumma bārik 'alā Muḥammad… (Bukhari 3370).",
  "Recited in every tashahhud before salām."
];

export default function SalatOnProphet() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣalāh Upon the Prophet ﷺ" description="'Whoever sends ṣalāh on me once, Allah sends ṣalāh on him ten times.' The wording, times, and virtue." path="/salawat" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṣalāh 'Ala-n-Nabī ﷺ</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Virtue</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Wording — the Ibrāhīmiyyah</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}