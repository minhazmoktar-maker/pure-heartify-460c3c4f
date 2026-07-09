import { Link } from "react-router-dom";
import { ArrowLeft, Flower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Idol worship contradicts tawḥīd (Qur'an 21:66-67).", 'Some Buddhists may be considered ahl-al-fatrah for pre-message eras.', 'Common good in ethics; foundational ʿaqīdah differs.', "Dawah with wisdom (Qur'an 16:125)."];

export default function HinduismBuddhism() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islam & Eastern Religions — Heartify" description="Islam & Eastern Religions: Islamic view." path="/hinduism-buddhism" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Flower className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islam & Eastern Religions</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Islamic view</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
