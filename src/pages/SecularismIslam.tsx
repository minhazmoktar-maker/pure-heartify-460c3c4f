import { Link } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Secularism separates law from revelation — contradicts sharīʿah's comprehensiveness.", 'Islam integrates worship, law, and public life.', 'Muslims in secular states uphold justice, engage civically.', 'Reject imposing kufr on Muslims via secular fiat.'];

export default function SecularismIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Secularism & Islam — Heartify" description="Secularism & Islam: Analysis." path="/secularism-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Scale className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Secularism & Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Analysis</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
