import { Link } from "react-router-dom";
import { ArrowLeft, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const V = [
  { v: "The Night of Decree is better than a thousand months. The angels and the Rūḥ descend therein by permission of their Lord for every matter — Peace it is until the emergence of dawn.", ref: "Qur'an 97:3–5" },
  { v: "Seek it in the last ten nights of Ramadan, in the odd nights.", ref: "Bukhari 2017" },
  { v: "Whoever stands (in prayer) on Laylat al-Qadr with faith and seeking reward, his past sins are forgiven.", ref: "Bukhari 2014; Muslim 760" },
  { v: "Its signs: a calm, tranquil night — neither hot nor cold; and the sun rises the next morning white, without piercing rays.", ref: "Muslim 762" },
];
const DUA = {
  arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
  translit: "Allāhumma innaka 'afuwwun tuḥibbul-'afwa fa'fu 'annī.",
  english: "O Allah, You are the Pardoner and love to pardon, so pardon me.",
  ref: "Tirmidhi 3513 — Ṣaḥīḥ (from 'Ā'ishah — she asked the Prophet ﷺ what to say if she found it)",
};
const NIGHTS = ["21st", "23rd", "25th", "27th", "29th"];

export default function LaylatAlQadr() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Laylat al-Qadr — The Night of Decree" description="Virtues, signs, and the du'ā of Laylat al-Qadr — the night better than a thousand months, sought in the last ten odd nights of Ramadan." path="/laylat-al-qadr" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Moon className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Laylat al-Qadr</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        {V.map((v, i) => (<Card key={i} className="p-4"><div>{v.v}</div><div className="text-xs text-muted-foreground mt-1">{v.ref}</div></Card>))}
        <Card className="p-4 border-primary/30 bg-primary/5 space-y-2">
          <div className="font-semibold">The Du'ā to Say</div>
          <p className="text-right text-xl leading-loose" dir="rtl">{DUA.arabic}</p>
          <p className="italic text-sm text-muted-foreground">{DUA.translit}</p>
          <p className="text-sm">{DUA.english}</p>
          <p className="text-xs text-muted-foreground">{DUA.ref}</p>
        </Card>
        <Card className="p-4"><div className="font-semibold mb-2">Odd Nights to Seek It</div><div className="flex flex-wrap gap-2">{NIGHTS.map(n => <span key={n} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">{n} of Ramadan</span>)}</div><p className="text-xs text-muted-foreground mt-2">The 27th is the most likely, based on the position of Ubayy b. Ka'b (Muslim 762).</p></Card>
      </div>
    </div>
  );
}
