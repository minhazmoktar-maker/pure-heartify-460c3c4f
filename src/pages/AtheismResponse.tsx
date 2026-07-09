import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Design points to Designer (Qur'an 52:35-36).", 'Moral objectivity requires transcendent source.', "Historical & textual preservation of Qur'an.", 'Fitrah — innate recognition of Creator (Rūm 30:30).'];

export default function AtheismResponse() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Responding to Atheism — Heartify" description="Responding to Atheism: Foundational answers." path="/atheism-response" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <HelpCircle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Responding to Atheism</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Foundational answers</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
