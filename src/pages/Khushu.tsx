import { Link } from "react-router-dom";
import { ArrowLeft, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const KEYS = [
  { t: "Prepare before the prayer", d: "Complete wudu with care, wear clean clothes, arrive early, respond to the adhān, pray the sunnah rawātib.", ref: "Muslim 234" },
  { t: "Understand what you recite", d: "Study the meaning of al-Fātiḥah, at-taḥiyyāt, and short surahs — you cannot be present in what you do not understand.", ref: "Qur'an 47:24" },
  { t: "Feel you are being watched", d: "Worship Allah as though you see Him — for though you see Him not, He sees you.", ref: "Bukhari 50; Muslim 8 — Ḥadīth Jibrīl" },
  { t: "Recite slowly (tartīl)", d: "Pause at verses of mercy to ask, at verses of punishment to seek refuge — as the Prophet ﷺ did.", ref: "Muslim 772" },
  { t: "Pray as if it is your last", d: "When you stand for prayer, pray the prayer of one bidding farewell.", ref: "Ibn Mājah 4171 — Ḥasan" },
  { t: "Fix your gaze at the place of prostration", d: "Do not look up during prayer — lest your sight not return.", ref: "Bukhari 750" },
  { t: "Remove distractions", d: "The Prophet ﷺ ordered a garment with markings be removed because it distracted him in prayer.", ref: "Bukhari 373" },
  { t: "Say the du'ās between the pillars", d: "Especially in sujūd — the closest a servant is to his Lord is in prostration; so supplicate abundantly.", ref: "Muslim 482" },
];
export default function Khushu() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Khushū' in Ṣalāh — Presence of Heart in Prayer" description="Eight authentic keys from the Sunnah to attain khushū' — humility and presence of heart — in the five daily prayers." path="/khushu" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Focus className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Khushū' in Ṣalāh</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
        <Card className="p-4 border-primary/30 bg-primary/5"><p className="text-sm">"Successful indeed are the believers — those who are humble in their prayers." — Qur'an 23:1–2.</p></Card>
        {KEYS.map((k, i) => (<Card key={i} className="p-4"><div className="font-medium">{i + 1}. {k.t}</div><div className="text-sm mt-1">{k.d}</div><div className="text-xs text-muted-foreground mt-1">{k.ref}</div></Card>))}
      </div>
    </div>
  );
}
