import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const LEVELS = [
  { t: "Shukr of the heart", d: "Recognizing every blessing is from Allah alone." },
  { t: "Shukr of the tongue", d: "Praising Allah — Alḥamdulillāh — and speaking of His favors." },
  { t: "Shukr of the limbs", d: "Using every blessing in obedience to the One who gave it." },
];
const ITEMS = [
  { v: "If you are grateful, I will surely increase you.", ref: "Qur'an 14:7" },
  { v: "It is Allah you must worship, and be among the grateful.", ref: "Qur'an 39:66" },
  { v: "The Prophet ﷺ stood in prayer until his feet swelled. He said: Shall I not be a grateful servant?", ref: "Bukhari 4837; Muslim 2820" },
  { v: "After every prayer, say: Allāhumma a'innī 'alā dhikrika wa shukrika wa ḥusni 'ibādatik.", ref: "Abu Dawud 1522 — Ṣaḥīḥ" },
  { v: "Whoever is not grateful to people is not grateful to Allah.", ref: "Abu Dawud 4811; Tirmidhi 1954" },
  { v: "Look at those below you and not above you — it is more likely to keep you from belittling Allah's blessings.", ref: "Bukhari 6490; Muslim 2963" },
];
export default function Shukr() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Shukr — Gratitude to Allah" description="The three levels of gratitude — heart, tongue, and limbs — with verses and authentic Prophetic teachings on thankfulness." path="/shukr" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Sparkles className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Shukr — Gratitude</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Three Levels</h2>
        {LEVELS.map((l, i) => (<Card key={i} className="p-4"><div className="font-medium">{l.t}</div><div className="text-sm mt-1">{l.d}</div></Card>))}
        <h2 className="font-semibold pt-2">Qur'an & Sunnah</h2>
        {ITEMS.map((x, i) => (<Card key={i} className="p-4"><div>{x.v}</div><div className="text-xs text-muted-foreground mt-1">{x.ref}</div></Card>))}
      </div>
    </div>
  );
}
