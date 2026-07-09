import { Link } from "react-router-dom";
import { ArrowLeft, Scroll } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function MirathBasics() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Mīrāth — Inheritance Basics" description="The Islamic law of inheritance — an overview" path="/mirath-basics" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Scroll className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Mīrāth — Inheritance Basics</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Sequence</h2>
        <Card key="0-0" className="p-4"><div>Funeral costs → debts → up to 1/3 bequest → then fixed shares (Qur'an 4:11–12).</div></Card>
        <h2 className="font-semibold pt-2">Key Heirs</h2>
        <Card key="1-0" className="p-4"><div>Spouse, parents, children — all with fixed Qur'anic shares before residuary.</div></Card>
      </div>
    </div>
  );
}
