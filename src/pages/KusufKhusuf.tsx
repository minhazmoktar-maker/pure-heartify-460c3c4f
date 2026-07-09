import { Link } from "react-router-dom";
import { ArrowLeft, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'The sun and the moon are two signs of Allah; they do not eclipse for the death or birth of anyone. If you see this, pray and make du'ā' (Bukhari 1043).",
  "Occasion for du'ā, istighfār, ṣadaqah, freeing slaves, dhikr."
];
const S1 = [
  "Two rak'ah in jamā'ah, aloud (Bukhari 1065, Muslim 901).",
  "Each rak'ah: two qiyāms and two rukū's, then two sujūd.",
  "Followed by a khuṭbah reminding of Allah's signs."
];

export default function KusufKhusuf() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ṣalāt al-Kusūf & al-Khusūf — Eclipse Prayers" description="The Sunnah prayer at solar and lunar eclipses — two long rak'ah with two rukū's each." path="/kusuf-khusuf" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <CircleDot className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Eclipse Prayers</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Cause</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}