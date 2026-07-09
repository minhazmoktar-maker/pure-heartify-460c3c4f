import { Link } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function FidyahKaffarah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Fidyah & Kaffārah" description="Redemptions for missed fasts and broken oaths" path="/fidyah-kaffarah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Scale className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Fidyah & Kaffārah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Fidyah</h2>
        <Card key="0-0" className="p-4"><div>Feed one poor person per missed fast for those unable (chronic illness, old age) — Qur'an 2:184.</div></Card>
        <h2 className="font-semibold pt-2">Kaffārah</h2>
        <Card key="1-0" className="p-4"><div>Deliberately breaking a Ramaḍān fast: free a slave, or fast 60 consecutive days, or feed 60 poor (Bukhari 1936).</div></Card>
      </div>
    </div>
  );
}
