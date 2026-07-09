import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Islam preserves fitrah — male & female (Qur'an 4:1, 49:13).", "Same-sex acts are unlawful (Qur'an 7:80-84; 26:165-166).", 'Distinction between struggle (temptation) and action.', 'Mercy in dawah; firmness in rulings.'];

export default function LgbtqIslamicView() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="LGBTQ in Islam — Heartify" description="LGBTQ in Islam: Sharī'ah view." path="/lgbtq-islamic-view" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Heart className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">LGBTQ in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Sharī'ah view</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
