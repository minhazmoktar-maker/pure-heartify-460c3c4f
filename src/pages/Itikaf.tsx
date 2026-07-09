import { Link } from "react-router-dom";
import { ArrowLeft, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S = [
  { t: "Definition", d: "I'tikāf — remaining in the masjid with the intention of worship, seeking Allah's pleasure. It was the confirmed Sunnah of the Prophet ﷺ every Ramadan.", ref: "Bukhari 2026; Muslim 1172" },
  { t: "Best Time", d: "The last ten nights of Ramadan — the Prophet ﷺ observed it every year, and in the year of his death he did i'tikāf for 20 nights.", ref: "Bukhari 2044" },
  { t: "Conditions", d: "1) A Muslim, 2) 'āqil (sane), 3) free of ḥayḍ/nifās, 4) in a masjid where the five prayers are established, 5) with intention (niyyah).", ref: "Ibn Qudāmah, al-Mughnī 3/188" },
  { t: "Enter Before Sunset", d: "For last-10 i'tikāf: enter the masjid before Maghrib on the 20th of Ramadan and leave after Maghrib on the last day (or after 'Eid).", ref: "Bukhari 2041" },
  { t: "What to Do", d: "Prayer, Qur'an recitation, dhikr, du'ā, seeking knowledge, Tahajjud. Avoid unnecessary speech, social media, and worldly business.", ref: "Ibn Rajab, Laṭā'if al-Ma'ārif" },
  { t: "Permitted", d: "Eating and sleeping in the masjid, using the bathroom (leave briefly), washing head, receiving a spouse briefly.", ref: "Bukhari 2029, 2035" },
  { t: "Nullifiers", d: "Leaving the masjid without valid reason, intercourse, loss of intellect, apostasy (Allah's refuge), menstruation.", ref: "Ibn Qudāmah, al-Mughnī" },
  { t: "Women's I'tikāf", d: "Permissible in the masjid with her guardian's permission and no fitnah — 'Ā'ishah, Ḥafṣah, and Zaynab did i'tikāf.", ref: "Bukhari 2033" },
];
export default function Itikaf() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="I'tikāf — The Ramadan Spiritual Retreat" description="A complete guide to i'tikāf in the last ten nights of Ramadan: conditions, timing, what to do, permitted actions, and nullifiers." path="/itikaf" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Tent className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">I'tikāf</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
        {S.map((s, i) => (<Card key={i} className="p-4"><div className="font-semibold">{s.t}</div><div className="text-sm mt-1">{s.d}</div><div className="text-xs text-muted-foreground mt-1">{s.ref}</div></Card>))}
      </div>
    </div>
  );
}
