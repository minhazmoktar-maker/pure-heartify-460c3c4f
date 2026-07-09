import { Link } from "react-router-dom";
import { ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Major sin — 'Whoever kills himself…' (Bukhari 5778).", "But Allah's mercy — encourage tawbah of the tempted.", 'Get help: professional therapy, ruqyah, community.', 'Crisis hotlines: 988 (US), 116 123 (UK Samaritans).'];

export default function SuicidePrevention() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Suicide in Islam — Heartify" description="Suicide in Islam: Ruling & support." path="/suicide-prevention" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Phone className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Suicide in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Ruling & support</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
