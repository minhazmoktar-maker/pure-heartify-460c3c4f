import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Ghībah: mentioning your brother in a way he would dislike, even if true (Muslim 2589).",
  "Namīmah: carrying tales between people to spoil relations — 'the tale-carrier will not enter Paradise' (Bukhari 6056).",
  "If it is false, it is buhtān (slander) — greater in sin."
];
const S1 = [
  "Complaint of oppression to one who can help.",
  "Warning against a proposed spouse, business partner, or scholar of innovation.",
  "Seeking a fatwa: 'My father did such and such.'",
  "Publicly known open sinner.",
  "Necessary identification (e.g., the lame one)."
];
const S2 = [
  "Sincere regret and stopping immediately.",
  "Ask Allah's forgiveness abundantly.",
  "If the person did not hear it: make du'ā for him and mention him with good.",
  "If he heard it: seek his pardon (Bukhari 2449)."
];

export default function Ghibah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ghībah & Namīmah — Backbiting and Slander" description="The Qur'an compares ghībah to eating your brother's corpse. Definition, exceptions, and the path to tawbah." path="/ghibah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <MessageSquareOff className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ghībah & Namīmah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Definition</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Exceptions (Nawawi)</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Tawbah</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}