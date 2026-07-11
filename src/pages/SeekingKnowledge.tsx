import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const VIRTUES = [
  { v: "Allah raises in ranks those who believe among you, and those given knowledge.", ref: "Qur'an 58:11" },
  { v: "Say: Are those who know equal to those who do not know?", ref: "Qur'an 39:9" },
  { v: "The angels lower their wings for the seeker of knowledge, pleased with what he seeks.", ref: "Abu Dawud 3641 — Ṣaḥīḥ" },
  { v: "Whoever travels a path in search of knowledge, Allah makes easy for him a path to Paradise.", ref: "Muslim 2699" },
  { v: "The scholars are the inheritors of the Prophets — and the Prophets did not leave dinars or dirhams, only knowledge.", ref: "Abu Dawud 3641" },
  { v: "When Allah wishes good for someone, He grants him understanding of the religion.", ref: "Bukhari 71; Muslim 1037" },
];
const ADAB = [
  "Purify intention — seek Allah's face alone, not to argue with fools or amass followers",
  "Begin with foundations — 'aqīdah, ṭahārah, ṣalāh, and Qur'an memorization before subsidiary matters",
  "Take from qualified teachers with connected chains — not just books or videos",
  "Sit before the scholar with humility, silence, and note-taking",
  "Act on what you learn — the first knowledge is that which reforms the actor",
  "Teach others — knowledge is a trust; conveying it is an obligation",
  "Guard time — leave what does not concern you; the salaf feared wasting a single hour",
  "Continually seek increase — 'Say: My Lord, increase me in knowledge.' (Qur'an 20:114)",
];
export default function SeekingKnowledge() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Ṭalab al-'Ilm — Seeking Islamic Knowledge" description="Virtues of knowledge from Qur'an and Sunnah, and eight adab (etiquettes) of the student of sacred knowledge." path="/seeking-knowledge" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><BookOpen className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Ṭalab al-'Ilm</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Virtues of Knowledge</h2>
        {VIRTUES.map((v, i) => (<Card key={i} className="p-4"><div>{v.v}</div><div className="text-xs text-muted-foreground mt-1">{v.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Adab of the Student</h2>
        {ADAB.map((a, i) => (<Card key={i} className="p-4"><div>{i + 1}. {a}</div></Card>))}
      </div>
    </div>
  );
}
