import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Read slowly, one page.', 'Ask: what, why, apply.', 'Journal one ayah daily.', 'Cross-check with tafsīr.'];

export default function QuranReflection() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Qur'an Reflection (Tadabbur) — Heartify" description={'Deep reflection habits.'} path="/quran-reflection" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Qur'an Reflection (Tadabbur)</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Deep reflection habits.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
