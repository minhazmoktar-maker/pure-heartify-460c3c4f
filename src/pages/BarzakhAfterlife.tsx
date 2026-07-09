import { Link } from "react-router-dom";
import { ArrowLeft, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function BarzakhAfterlife() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Al-Barzakh — Life in the Grave" description="The intermediate life between death and resurrection" path="/barzakh-afterlife" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Landmark className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Al-Barzakh — Life in the Grave</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Evidence</h2>
        <Card key="0-0" className="p-4"><div>'Behind them is a barzakh until the Day they are resurrected' (Qur'an 23:100).</div></Card>
        <h2 className="font-semibold pt-2">Trial</h2>
        <Card key="1-0" className="p-4"><div>Two angels question every soul about Lord, religion, and Prophet ﷺ — Abū Dāwūd 4753.</div></Card>
      </div>
    </div>
  );
}
