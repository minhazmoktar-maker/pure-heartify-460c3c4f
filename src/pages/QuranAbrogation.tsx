import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Later ruling replaces earlier in some cases.', 'Wisdom: gradual legislation (e.g., alcohol prohibition).', "Only Qur'an/Sunnah can abrogate Qur'an/Sunnah.", 'Scholars differ on exact count of abrogated verses.'];

export default function QuranAbrogation() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Naskh (Abrogation) — Heartify" description="Naskh (Abrogation): Concept." path="/naskh" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <RefreshCw className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Naskh (Abrogation)</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Concept</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
