import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Qur'an 3:103 — 'Hold firmly to the rope of Allah together and do not divide.'",
  "Qur'an 49:10 — 'The believers are but brothers.'",
  "'The believers in mutual love are like one body — if a limb aches, the whole body feels it' (Bukhari 6011)."
];
const S1 = [
  "Ghībah, namīmah, ẓulm.",
  "Excessive takfīr and hizbiyyah (partisanship).",
  "Nationalism above dīn.",
  "Neglecting Muslim rights (feeding sick, funeral, greeting)."
];

export default function UmmahUnity() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Unity of the Ummah" description="The obligation to hold to the rope of Allah, avoid division, and love for a brother what you love for yourself." path="/ummah-unity" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Unity of the Ummah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Command</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">What breaks unity</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}