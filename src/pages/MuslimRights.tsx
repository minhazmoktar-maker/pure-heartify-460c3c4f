import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const SIX = [
  { t: "When you meet him — give the salām", d: "As-salāmu 'alaykum wa raḥmatullāhi wa barakātuh — the greeting of the people of Paradise." },
  { t: "When he invites you — accept the invitation", d: "Especially the walīmah (wedding banquet) — refusing is a form of arrogance." },
  { t: "When he seeks advice — give sincere advice (naṣīḥah)", d: "The religion is naṣīḥah — Muslim 55." },
  { t: "When he sneezes and praises Allah — say Yarḥamuk Allāh", d: "He replies: Yahdīkum Allāhu wa yuṣliḥu bālakum." },
  { t: "When he is ill — visit him", d: "The visitor is in the harvest-garden of Paradise until he returns — Muslim 2568." },
  { t: "When he dies — follow his funeral", d: "One qīrāṭ of reward for the funeral, another if you stay until burial — each qīrāṭ like Mount Uḥud." },
];
export default function MuslimRights() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Six Rights of the Muslim Upon the Muslim" description="The six rights every Muslim owes another Muslim: salām, accepting invitations, naṣīḥah, responding to sneezing, visiting the ill, and attending funerals." path="/muslim-rights" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Users className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Six Rights of the Muslim</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
        <Card className="p-4 border-primary/30 bg-primary/5"><p className="text-sm">"The right of a Muslim upon a Muslim is six…" — Muslim 2162.</p></Card>
        {SIX.map((x, i) => (<Card key={i} className="p-4"><div className="font-medium">{i + 1}. {x.t}</div><div className="text-sm mt-1">{x.d}</div></Card>))}
      </div>
    </div>
  );
}
