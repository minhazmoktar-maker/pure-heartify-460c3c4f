import { Link } from "react-router-dom";
import { ArrowLeft, MountainSnow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const KINDS = [
  { t: "Ṣabr 'alā aṭ-ṭā'ah", d: "Patience in obeying Allah — persistence in prayer, fasting, and truth.", ref: "Qur'an 20:132" },
  { t: "Ṣabr 'an al-ma'ṣiyah", d: "Patience in restraining from disobedience — controlling desires.", ref: "Qur'an 12:53" },
  { t: "Ṣabr 'alā al-qadar", d: "Patience with divine decree — trials, illness, loss.", ref: "Qur'an 2:155–157" },
];
const VIRTUES = [
  { v: "Allah is with the patient.", ref: "Qur'an 2:153" },
  { v: "The patient will be given their reward without measure.", ref: "Qur'an 39:10" },
  { v: "No one has been given a gift better and more comprehensive than patience.", ref: "Bukhari 1469; Muslim 1053" },
  { v: "Amazing is the affair of the believer — if good befalls him he is grateful; if harm, he is patient — both are good for him.", ref: "Muslim 2999" },
  { v: "Patience is at the first strike.", ref: "Bukhari 1283" },
  { v: "Whoever endures loss of two beloved things (eyes) with patience, I shall replace them with Paradise.", ref: "Bukhari 5653" },
];
export default function Sabr() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣabr — Patience in Islam" description="The three types of patience — in obedience, from sin, and with divine decree — with Qur'anic verses and authentic hadith." path="/sabr" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><MountainSnow className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Ṣabr — Patience</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Three Kinds of Patience</h2>
        {KINDS.map((k, i) => (<Card key={i} className="p-4"><div className="font-medium">{k.t}</div><div className="text-sm mt-1">{k.d}</div><div className="text-xs text-muted-foreground mt-1">{k.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Virtues from Qur'an & Sunnah</h2>
        {VIRTUES.map((v, i) => (<Card key={i} className="p-4"><div>{v.v}</div><div className="text-xs text-muted-foreground mt-1">{v.ref}</div></Card>))}
      </div>
    </div>
  );
}
