import { Link } from "react-router-dom";
import { ArrowLeft, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function IddahRules() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="'Iddah — Waiting Period" description="Post-marital waiting periods and their purpose" path="/iddah-rules" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Timer className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">'Iddah — Waiting Period</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Durations</h2>
        <Card key="0-0" className="p-4"><div>Divorce: 3 menstrual cycles (Qur'an 2:228).</div></Card>
        <Card key="0-1" className="p-4"><div>Widow: 4 months 10 days (Qur'an 2:234).</div></Card>
        <Card key="0-2" className="p-4"><div>Pregnant: until delivery.</div></Card>
        <h2 className="font-semibold pt-2">Purpose</h2>
        <Card key="1-0" className="p-4"><div>Confirm no pregnancy; allow possible reconciliation; honor the deceased.</div></Card>
      </div>
    </div>
  );
}
