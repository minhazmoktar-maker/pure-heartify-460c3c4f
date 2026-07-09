import { Link } from "react-router-dom";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Qur'an 16:125 — 'Call to the way of your Lord with ḥikmah and fair preaching, and argue in the best manner.'",
  "'Convey from me, even one verse' (Bukhari 3461).",
  "Da'wah begins with tawḥīd, then ṣalāh, then the rest (Bukhari 1458 — Mu'ādh to Yemen)."
];
const S1 = [
  "Sincerity — for Allah alone, not fame or followers.",
  "Knowledge before speech (Qur'an 47:19).",
  "Gentleness — 'Speak to him mildly' (Qur'an 20:44).",
  "Patience with rejection — the prophets faced the same.",
  "Practice what you preach (Qur'an 61:2-3)."
];
const S2 = [
  "Your own household first (Qur'an 66:6).",
  "Family, then relatives, then community.",
  "Correct false beliefs before secondary issues.",
  "Do not shame publicly — advise privately."
];

export default function Dawah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Da'wah — Calling to Allah" description="The etiquette, wisdom (ḥikmah), and priorities of calling people to Islam — for scholars and laypeople." path="/dawah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Megaphone className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Da'wah — Calling to Allah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Foundations</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Adab of the dā'ī</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Priorities</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}