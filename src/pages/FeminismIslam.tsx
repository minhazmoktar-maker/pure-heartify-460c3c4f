import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Islam gave women rights 1400 years ago (inheritance, property, consent).', "Equity, not identical roles — complementary (Qur'an 4:32).", 'Reject radical feminism that opposes fitrah.', "Uphold ḥayā', mahr, family, motherhood as honor."];

export default function FeminismIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Feminism & Islam — Heartify" description="Feminism & Islam: Balanced view." path="/feminism-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Feminism & Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Balanced view</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
