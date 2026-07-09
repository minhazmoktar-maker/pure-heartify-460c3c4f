import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'Whoever wants his wealth increased and life extended, let him maintain ties of kinship' (Bukhari 5986).",
  "'The one who cuts ties will not enter Paradise' (Bukhari 5984).",
  "Ties are maintained even if the other side cuts (Ahmad 6524)."
];
const S1 = [
  "Regular visits, calls, messages, gifts to relatives.",
  "Start with parents, then siblings, then closest relatives.",
  "Ma'rūf treatment even to non-Muslim relatives (Qur'an 60:8)."
];

export default function SilaturRahm() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣilat ar-Raḥim — Ties of Kinship" description="The obligation to maintain family ties, its worldly and eternal rewards, and the sin of severing them." path="/silat-rahm" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṣilat ar-Raḥim</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Command</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Practice</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}