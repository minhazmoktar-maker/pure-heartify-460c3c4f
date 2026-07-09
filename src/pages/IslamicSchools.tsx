import { Link } from "react-router-dom";
import { ArrowLeft, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Balanced dīn + dunyā curriculum.', 'Qualified ʿulamāʾ on staff.', 'Safeguarding policies.', 'Parent involvement.'];

export default function IslamicSchools() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic School Directory — Heartify" description={'Choosing an Islamic school.'} path="/islamic-schools" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <School className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic School Directory</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Choosing an Islamic school.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
