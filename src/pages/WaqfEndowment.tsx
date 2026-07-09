import { Link } from "react-router-dom";
import { ArrowLeft, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function WaqfEndowment() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Waqf — Islamic Endowment" description="Perpetual charity structures in Islam" path="/waqf-endowment" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Landmark className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Waqf — Islamic Endowment</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Definition</h2>
        <Card key="0-0" className="p-4"><div>A perpetual charitable trust — capital preserved, benefit distributed.</div></Card>
        <h2 className="font-semibold pt-2">Examples</h2>
        <Card key="1-0" className="p-4"><div>Umar's date grove (Bukhari 2737).</div></Card>
        <Card key="1-1" className="p-4"><div>Mosques, wells, schools, and public utilities.</div></Card>
      </div>
    </div>
  );
}
