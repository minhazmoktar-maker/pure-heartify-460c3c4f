import { Link } from "react-router-dom";
import { ArrowLeft, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Prophet ﷺ rebuked for turning from blind ʿAbdullāh ibn Umm Maktūm (Qur'an 80:1-11).", 'Accessibility in masjids is a communal duty.', 'Rewards multiplied for patience.', 'Include in shūrā, not marginalized.'];

export default function DisabilityIslam() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Disability in Islam — Heartify" description="Disability in Islam: Dignity & rights." path="/disability-islam" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Accessibility className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Disability in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Dignity & rights</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
