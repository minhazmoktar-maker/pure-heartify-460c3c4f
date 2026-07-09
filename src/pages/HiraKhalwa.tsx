import { Link } from "react-router-dom";
import { ArrowLeft, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "The Prophet ﷺ used to seclude himself in Ḥirā' for many nights of worship (Bukhari 3).",
  "Not rahbāniyyah — he returned to family and community.",
  "Purposeful — dhikr, tafakkur, du'ā, Qur'an."
];
const S1 = [
  "I'tikāf in the last 10 of Ramadan.",
  "Daily 5–10 minutes of silent dhikr.",
  "Occasional retreat from social media for muḥāsabah."
];

export default function HiraKhalwa() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ḥirā' & Khalwah — Sacred Solitude" description="The Prophet ﷺ withdrew to Ḥirā' for tahannuth. The role of purposeful solitude in the believer's life." path="/hira" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Mountain className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ḥirā' & Khalwah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Prophetic model</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Applications</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}