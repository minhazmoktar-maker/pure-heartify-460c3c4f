import { Link } from "react-router-dom";
import { ArrowLeft, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Purity of body and provision — 'His food is ḥarām, how can he be answered?' (Muslim 1015).",
  "Face qiblah, raise hands, if possible be in wuḍū.",
  "Begin with ḥamd of Allah, then ṣalāh upon the Prophet ﷺ (Tirmidhi 3477)."
];
const S1 = [
  "With ḥuḍūr al-qalb — presence of heart (Tirmidhi 3479).",
  "Between fear and hope; certain of acceptance.",
  "Ask by Allah's names and attributes (Qur'an 7:180).",
  "Do not say 'O Allah forgive me if You wish' — be resolute (Bukhari 6339).",
  "Repeat three times (Muslim 1794)."
];
const S2 = [
  "Last third of the night (Bukhari 1145).",
  "Between adhān and iqāmah (Abu Dawud 521).",
  "Last hour of Friday (Muslim 852).",
  "When breaking fast (Ibn Mājah 1753).",
  "In sujūd (Muslim 482).",
  "On the day of 'Arafah (Tirmidhi 3585)."
];

export default function DuaEtiquette() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Adab of Du'ā — Etiquette of Supplication" description="How the Prophet ﷺ taught us to supplicate: purity, praise, salawāt, humility, and the times of acceptance." path="/dua-etiquette" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Hand className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Adab of Du'ā</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Before you ask</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Manner</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Times of acceptance</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}