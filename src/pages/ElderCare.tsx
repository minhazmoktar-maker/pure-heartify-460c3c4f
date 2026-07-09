import { Link } from "react-router-dom";
import { ArrowLeft, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["'Not one of us who does not honor our elders' (Tirmidhi 1919).", "Parents in old age: never say 'uff' (Qur'an 17:23).", 'Nursing homes generally discouraged when family can care.', 'Community responsibility beyond immediate family.'];

export default function ElderCare() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Elder Care — Heartify" description="Elder Care: Islamic obligation." path="/elder-care" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <UserRoundCog className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Elder Care</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Islamic obligation</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
