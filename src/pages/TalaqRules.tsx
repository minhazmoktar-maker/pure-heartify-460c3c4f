import { Link } from "react-router-dom";
import { ArrowLeft, FileMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function TalaqRules() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṭalāq — Divorce Rulings" description="Sunnī procedure and the three pronouncements" path="/talaq-rules" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <FileMinus className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṭalāq — Divorce Rulings</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Sunnī Ṭalāq</h2>
        <Card key="0-0" className="p-4"><div>Pronounced in a period of purity without intercourse.</div></Card>
        <Card key="0-1" className="p-4"><div>One pronouncement — revocable during 'iddah.</div></Card>
        <h2 className="font-semibold pt-2">Warnings</h2>
        <Card key="1-0" className="p-4"><div>Three pronouncements ends the marriage irrevocably (Qur'an 2:229).</div></Card>
      </div>
    </div>
  );
}
