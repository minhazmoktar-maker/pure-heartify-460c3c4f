import { Link } from "react-router-dom";
import { ArrowLeft, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function HudaybiyahLessons() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ḥudaybiyyah" description="The clear victory" path="/hudaybiyah-lessons" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <FileSignature className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ḥudaybiyyah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Lessons</h2>
        <Card key="0-0" className="p-4"><div>Apparent loss, real gain (Q 48:1).</div></Card><Card key="0-1" className="p-4"><div>Patience with divine wisdom.</div></Card>
      </div>
    </div>
  );
}
