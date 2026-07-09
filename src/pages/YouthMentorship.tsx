import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Pair youth with practicing role models.', 'Focus on identity, prayer, purpose.', 'Create halaqāt in schools & masājid.', 'Track progress with weekly check-ins.'];

export default function YouthMentorship() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muslim Youth Mentorship — Heartify" description={"Building strong mentors for the ummah's youth."} path="/youth-mentorship" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muslim Youth Mentorship</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Building strong mentors for the ummah's youth.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
