import { Link } from "react-router-dom";
import { ArrowLeft, Cross } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function FuneralRites() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Janāzah — Funeral Rites" description="Ghusl, kafan, ṣalāh, burial" path="/funeral-rites" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Cross className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Janāzah — Funeral Rites</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Order</h2>
        <Card key="0-0" className="p-4"><div>Ghusl → kafan → janāzah prayer (four takbīrs) → burial facing qiblah.</div></Card>
        <h2 className="font-semibold pt-2">Merits</h2>
        <Card key="1-0" className="p-4"><div>A qīrāṭ of reward for attending, two for attending till burial (Bukhari 47).</div></Card>
      </div>
    </div>
  );
}
