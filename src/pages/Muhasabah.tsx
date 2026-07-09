import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Qur'an 59:18 — 'Let every soul look to what it has sent forth for tomorrow.'",
  "'Umar (raḍ): 'Take account of yourselves before you are taken to account.'",
  "Ḥasan al-Baṣrī: 'A believer is a guardian over himself — he audits himself for Allah.'"
];
const S1 = [
  "Fara'iḍ — did I pray on time, in jamā'ah?",
  "Tongue — ghībah, lies, futile speech?",
  "Eye and heart — what did I consume?",
  "Rights — parents, spouse, neighbor, employer?",
  "Barakah of time — how much wasted?",
  "One tawbah, one plan for tomorrow."
];
const S2 = [
  "Weekly: state of ṣalāh, Qur'an, ṣadaqah, du'ā list.",
  "Ramadan: annual reset — fasting, Qur'an khatm, i'tikāf, laylat al-qadr.",
  "Milestones: birthdays and Hijri new year as checkpoints, not celebrations."
];

export default function Muhasabah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muḥāsabah — Self-Accounting" description="'Take account of yourselves before you are taken to account' — 'Umar ibn al-Khaṭṭāb. A daily framework for the believer." path="/muhasabah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <ClipboardCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muḥāsabah — Self-Accounting</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Why</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Daily night audit</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Weekly and yearly</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}