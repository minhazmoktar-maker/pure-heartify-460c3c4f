import { Link } from "react-router-dom";
import { ArrowLeft, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Alphabet → nahw → ṣarf.', 'Daily 20 min habit.', "Read Qur'an with tajwīd.", 'Immerse via audio & shuyūkh.'];

export default function ArabicLearning() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Arabic Learning Path — Heartify" description={'Modern & Classical Arabic.'} path="/arabic-learning" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Languages className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Arabic Learning Path</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Modern & Classical Arabic.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
