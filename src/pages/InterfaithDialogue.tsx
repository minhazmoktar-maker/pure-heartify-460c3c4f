import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["'Argue with them in the best manner' (Qur'an 16:125).", 'No compromise on ʿaqīdah; kindness in manner.', 'Focus on shared ethics; clarify differences respectfully.', "Not 'all religions are equal' — that contradicts Qur'an 3:19."];

export default function InterfaithDialogue() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Interfaith Dialogue — Heartify" description="Interfaith Dialogue: Guidelines." path="/interfaith-dialogue" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Interfaith Dialogue</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Guidelines</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
