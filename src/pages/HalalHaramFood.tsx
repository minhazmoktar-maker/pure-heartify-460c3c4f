import { Link } from "react-router-dom";
import { ArrowLeft, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function HalalHaramFood() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Halal & Ḥarām Foods" description="Categories of permissible and forbidden foods" path="/halal-haram-food" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Beef className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Halal & Ḥarām Foods</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Explicitly Ḥarām</h2>
        <Card key="0-0" className="p-4"><div>Pork, blood, carrion, animals slaughtered other than for Allah (Qur'an 5:3).</div></Card>
        <h2 className="font-semibold pt-2">Conditions</h2>
        <Card key="1-0" className="p-4"><div>Meat: land animal with cloven hoof — no; correction: pronounce Allah's name; jugular cut by a Muslim/Kitābī.</div></Card>
        <Card key="1-1" className="p-4"><div>Seafood: generally ḥalāl (Qur'an 5:96).</div></Card>
      </div>
    </div>
  );
}
