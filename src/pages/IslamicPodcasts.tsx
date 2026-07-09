import { Link } from "react-router-dom";
import { ArrowLeft, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Verify speaker credentials.', "Cross-check with Qur'an & sunnah.", 'Diverse madhāhib exposure.', 'Avoid divisive rhetoric.'];

export default function IslamicPodcasts() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Podcasts — Heartify" description={"Curated audio da'wah."} path="/islamic-podcasts" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Mic className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Podcasts</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Curated audio da'wah.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
