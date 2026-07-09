import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'Visit graves, for they remind you of the Ākhirah' (Muslim 976).",
  "Say: as-salāmu 'alaykum ahla-d-diyār... (Muslim 974).",
  "Do not: sit on graves, walk over them with shoes if avoidable, or invoke the dead (shirk).",
  "Women visiting graves: majority allow with adab, no wailing (Ibn Mājah 1571)."
];
const S1 = [
  "'A visitor to the sick is in the harvest of Paradise until he returns' (Muslim 2568).",
  "Sit at his head; place hand on him; du'ā: as'alu-Llāha-l-'aẓīm rabba-l-'arshi-l-'aẓīm an yashfiyak — 7 times (Abu Dawud 3106).",
  "Short visit, kind words, remind of the reward of ṣabr."
];

export default function ZiyarahAdab() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Adab of Ziyārah — Visiting Graves & the Sick" description="The Sunnah way of visiting graves for reminder, and visiting the sick for reward." path="/ziyarah-adab" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <MapPin className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Adab of Ziyārah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Visiting graves</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Visiting the sick</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}