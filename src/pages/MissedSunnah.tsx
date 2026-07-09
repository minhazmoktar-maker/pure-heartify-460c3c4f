import { Link } from "react-router-dom";
import { ArrowLeft, Redo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "The Prophet ﷺ slept through Fajr and prayed the 2 sunnah then the fard after sunrise (Bukhari 344).",
  "He made up the 2 rak'ah of Ẓuhr's post-sunnah after 'Aṣr when he missed them (Bukhari 1233).",
  "'Umar's practice: he flogged for missing 'Aṣr but not for missing Sunan."
];
const S1 = [
  "Sunan mu'akkadah: 2 before Fajr, 4 before + 2 after Ẓuhr, 2 after Maghrib, 2 after 'Ishā', witr.",
  "If time permits before the next fard, make them up.",
  "Witr is made up before Ẓuhr per Ḥanafī; other views allow anytime after Fajr."
];

export default function MissedSunnah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Making Up Missed Sunnah Prayers" description="The Prophet ﷺ made up the Sunnah of Fajr after sunrise, and 2 rak'ah after 'Aṣr in place of Ẓuhr's post-sunnah." path="/missed-sunnah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Redo className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Missed Sunnahs</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Evidence</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Which sunnahs to make up</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}