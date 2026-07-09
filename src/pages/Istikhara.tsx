import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "For any matter that is permissible but you are hesitant about (Bukhari 1162).",
  "Not for obligations, prohibitions, or things already clearly good/evil.",
  "Best after making shūrā (consultation) and reasonable investigation."
];
const S1 = [
  "Pray 2 rak'ah of nafl (not the fard).",
  "After salām, raise hands and recite the du'ā of istikhārah (Bukhari 1162).",
  "Name the specific matter (silently or aloud) where indicated in the du'ā."
];
const S2 = [
  "Proceed with what your heart is at ease with; Allah opens or closes doors.",
  "No requirement to see a dream — that is not the Sunnah.",
  "Repeat if needed; there is no fixed number."
];

export default function Istikhara() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣalāt al-Istikhārah — Seeking Allah's Choice" description="The Sunnah of consulting Allah before a decision — the exact prayer, du'ā, and understanding the outcome." path="/istikhara" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Compass className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ṣalāt al-Istikhārah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">When</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">After</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}