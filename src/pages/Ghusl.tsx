import { Link } from "react-router-dom";
import { ArrowLeft, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "After janābah — sexual discharge or intercourse.",
  "End of ḥayḍ (menses) and nifās (postpartum).",
  "Death of a Muslim (ghusl of the body).",
  "Islam of a new Muslim (majority)."
];
const S1 = [
  "Jumu'ah (Bukhari 877).",
  "Two Eids.",
  "Before iḥrām for Ḥajj/'Umrah.",
  "After washing a deceased body (Abu Dawud 3161)."
];
const S2 = [
  "Wash hands 3x.",
  "Wash private parts.",
  "Perform complete wuḍū.",
  "Pour water over head 3x, running fingers through the roots.",
  "Pour water over the entire body — right side then left.",
  "Move away and wash the feet last."
];

export default function Ghusl() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Ghusl — The Full Ritual Bath" description="When ghusl is fard, when it is Sunnah, and the exact Prophetic method." path="/ghusl" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Droplet className="w-6 h-6 text-primary" />
        <h1 className="text-title font-bold">Ghusl</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">When fard</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">When Sunnah</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Method (Bukhari 248 — 'Ā'ishah)</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}