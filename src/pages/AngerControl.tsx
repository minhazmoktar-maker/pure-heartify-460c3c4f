import { Link } from "react-router-dom";
import { ArrowLeft, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Say a'ūdhu billāhi min ash-shayṭāni-r-rajīm (Bukhari 3282).",
  "If standing, sit; if sitting, lie down (Abu Dawud 4782).",
  "Make wuḍū — anger is from Shayṭān and Shayṭān is from fire (Abu Dawud 4784).",
  "Silence: 'If any of you becomes angry, let him be silent' (Ahmad 2136)."
];
const S1 = [
  "'Do not become angry' — repeated three times to the man who asked for advice (Bukhari 6116).",
  "Anger is a door that opens all other sins.",
  "Ḥilm (forbearance) is a beloved trait — the Prophet ﷺ said to Ashajj: 'You have two traits Allah loves: ḥilm and anāh' (Muslim 17)."
];

export default function AngerControl() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Anger — The Prophetic Cure" description="'The strong man is not the good wrestler; the strong man is the one who controls himself in anger.'" path="/anger" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Flame className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Managing Anger</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Prophetic remedies</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Foundations</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}