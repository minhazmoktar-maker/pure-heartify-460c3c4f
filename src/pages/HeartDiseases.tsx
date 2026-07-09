import { Link } from "react-router-dom";
import { ArrowLeft, HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const DIS = [
  { t: "Kibr — Arrogance", d: "Rejecting truth and looking down on people. No one with a mustard-seed of kibr enters Paradise.", cure: "Reflect on your origin (a drop) and your end (a corpse). Serve people. Sit with the humble.", ref: "Muslim 91" },
  { t: "Ḥasad — Envy", d: "Wishing another's blessing to be removed. It devours good deeds as fire devours wood.", cure: "Say mā shā' Allāh, make du'ā for the one envied, believe in qadar, be grateful for your own share.", ref: "Abu Dawud 4903 — Ḥasan" },
  { t: "Riya' — Showing off", d: "The hidden shirk. Doing worship for people's praise.", cure: "Hide extra good deeds; keep intentions between you and Allah; recall you cannot benefit from creation without His will.", ref: "Ahmad 23630 — Ṣaḥīḥ" },
  { t: "Ḥubb ad-Dunyā — Love of this world", d: "Making the world one's greatest concern. It is the head of every sin.", cure: "Visit graves. Recite Sūrat at-Takāthur. Remember death often — the destroyer of pleasures.", ref: "Tirmidhi 2377" },
  { t: "Ghaḍab — Uncontrolled anger", d: "The Prophet ﷺ said: The strong is not the good wrestler; the strong is the one who controls himself when angry.", cure: "Say a'ūdhu billāh; sit if standing; lie down if sitting; make wudu; be silent.", ref: "Bukhari 6114; Abu Dawud 4784" },
  { t: "Bukhl — Miserliness", d: "Withholding what Allah has obliged (zakat, family maintenance). It destroyed nations before you.", cure: "Give in secret. Reflect: charity does not decrease wealth.", ref: "Muslim 2578" },
  { t: "Sū' aẓ-ẓann — Suspicion", d: "Beware of suspicion, for suspicion is the most false of speech.", cure: "Assume 70 excuses for your brother. Verify before judging.", ref: "Bukhari 6064" },
  { t: "Ghībah — Backbiting", d: "Mentioning your brother with what he dislikes — worse than 36 acts of zinā if the person is righteous.", cure: "Guard the tongue; if you slipped, seek forgiveness from Allah and make du'ā for the person.", ref: "Muslim 2589; al-Ṣaḥīḥah 1871" },
];
export default function HeartDiseases() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Amrāḍ al-Qulūb — Diseases of the Heart & Their Cures" description="Eight major diseases of the heart — kibr, hasad, riya', hubb ad-dunya, ghadab, bukhl, sū' aẓ-ẓann, ghībah — with authentic Sunnah cures." path="/heart-diseases" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><HeartCrack className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Diseases of the Heart</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
        {DIS.map((x, i) => (
          <Card key={i} className="p-4 space-y-2">
            <div className="font-semibold">{i + 1}. {x.t}</div>
            <div className="text-sm">{x.d}</div>
            <div className="text-sm"><span className="font-medium text-primary">Cure:</span> {x.cure}</div>
            <div className="text-xs text-muted-foreground">{x.ref}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
