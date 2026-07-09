import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const V = [
  { v: "There are no days in which righteous deeds are more beloved to Allah than these ten. They said: Not even jihad in the way of Allah? He ﷺ said: Not even jihad — except a man who goes out with himself and his wealth and returns with none of it.", ref: "Bukhari 969" },
  { v: "By the dawn, and by the ten nights…", ref: "Qur'an 89:1–2 — the majority of mufassirīn: the first ten of Dhū al-Ḥijjah" },
  { v: "There are no days greater in the sight of Allah, nor in which deeds are more beloved to Him, than these ten days — so recite much tahlīl, takbīr, and taḥmīd.", ref: "Ahmad 5446 — Ṣaḥīḥ" },
];
const DEEDS = [
  { t: "Fasting the first 9 days", d: "Especially the Day of 'Arafah (9th) — it expiates the sins of the past year and the coming year (Muslim 1162)." },
  { t: "Takbīr", d: "Allāhu akbar, Allāhu akbar, lā ilāha illa-llāh, wa-llāhu akbar, Allāhu akbar wa lillāhil-ḥamd — aloud in markets, homes, and paths from 1st Dhū al-Ḥijjah to end of Tashrīq (13th)." },
  { t: "Qur'an recitation and dhikr", d: "The Prophet ﷺ said: recite much tahlīl, takbīr, and taḥmīd." },
  { t: "Charity and kindness to relatives", d: "Multiplied reward in these sacred days." },
  { t: "Uḍḥiyah (sacrifice)", d: "Confirmed Sunnah; whoever intends to sacrifice should not remove hair or nails from 1st Dhū al-Ḥijjah until the sacrifice (Muslim 1977)." },
  { t: "Ḥajj or 'Umrah", d: "If able, the greatest deed of these days." },
  { t: "Repentance", d: "Turn to Allah with sincere tawbah — the best of days for a new beginning." },
  { t: "Tahajjud & extra prayer", d: "Nights of standing — the salaf revived these nights." },
];

export default function DhulHijjah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="First 10 Days of Dhū al-Ḥijjah — Virtues & Deeds" description="The best days of the year: virtues of the first ten days of Dhū al-Ḥijjah, and the eight recommended deeds — fasting, takbīr, sacrifice, and hajj." path="/dhul-hijjah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Star className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">First Ten Days of Dhū al-Ḥijjah</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        {V.map((v, i) => (<Card key={i} className="p-4"><div>{v.v}</div><div className="text-xs text-muted-foreground mt-1">{v.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Recommended Deeds</h2>
        {DEEDS.map((d, i) => (<Card key={i} className="p-4"><div className="font-medium">{i + 1}. {d.t}</div><div className="text-sm mt-1">{d.d}</div></Card>))}
      </div>
    </div>
  );
}
