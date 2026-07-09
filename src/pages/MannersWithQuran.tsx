import { Link } from "react-router-dom";
import { ArrowLeft, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Wuḍū to touch the muṣḥaf (Qur'an 56:79) — majority view.",
  "Place the muṣḥaf above other books, never on the floor.",
  "Do not use worn muṣḥafs as decoration — bury or store respectfully."
];
const S1 = [
  "Isti'ādhah then basmalah at the start of a sūrah (except Tawbah).",
  "Tartīl — measured, beautified voice (Qur'an 73:4).",
  "Sujūd at-tilāwah at the marked verses.",
  "Do not recite while in janābah until ghusl (majority)."
];
const S2 = [
  "Silence when Qur'an is recited (Qur'an 7:204).",
  "Reflect, then act — 'They ponder its verses' (Qur'an 38:29).",
  "Weekly khatm or 7-ḥizb schedule (Sunnah of Ibn Mas'ūd)."
];

export default function MannersWithQuran() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Adab with the Qur'an" description="The etiquette of touching, reciting, listening to, and living by the Book of Allah." path="/quran-manners" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <BookMarked className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Adab with the Qur'an</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Handling</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Recitation</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Listening & living</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}