import { Link } from "react-router-dom";
import { ArrowLeft, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const CATS = [
  { t: "Tawḥīd ar-Rubūbiyyah", d: "Oneness of Lordship — Allah alone creates, sustains, gives life and death, and controls all affairs. Even the mushrikūn of Makkah affirmed this.", ref: "Qur'an 39:38; 23:84–89" },
  { t: "Tawḥīd al-Ulūhiyyah / al-'Ibādah", d: "Oneness of Worship — Allah alone is worshiped: prayer, sacrifice, vows, love, fear, hope, and reliance are directed to Him alone. This is why the Messengers were sent.", ref: "Qur'an 16:36; 51:56" },
  { t: "Tawḥīd al-Asmā' wa aṣ-Ṣifāt", d: "Oneness of Names and Attributes — affirm what Allah affirmed for Himself, and what His Messenger ﷺ affirmed, without taḥrīf, ta'ṭīl, takyīf, or tamthīl.", ref: "Qur'an 42:11; 7:180" },
];
const NULLIFIERS = [
  "Shirk in worship",
  "Placing intermediaries between oneself and Allah",
  "Not declaring the polytheists disbelievers, or doubting their kufr",
  "Believing another way is better than the Prophet's ﷺ guidance",
  "Hating anything the Messenger ﷺ came with, even while acting on it",
  "Mocking any part of Allah's religion, His reward or punishment",
  "Sorcery — practicing or approving it",
  "Aiding disbelievers against Muslims",
  "Believing some people may leave Sharī'ah as Khiḍr left Mūsā's law",
  "Turning completely away from the religion — not learning nor practicing",
];
export default function Tawheed() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Tawḥīd — The Oneness of Allah" description="The three categories of Tawḥīd (Rubūbiyyah, Ulūhiyyah, Asmā' wa Ṣifāt) and the ten nullifiers of Islam, from Qur'an and Sunnah." path="/tawheed" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Sun className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Tawḥīd</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Three Categories</h2>
        {CATS.map((c, i) => (<Card key={i} className="p-4"><div className="font-medium">{c.t}</div><div className="text-sm mt-1">{c.d}</div><div className="text-xs text-muted-foreground mt-1">{c.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">The Ten Nullifiers of Islam (Nawāqiḍ al-Islām — Shaykh Muḥammad b. 'Abd al-Wahhāb)</h2>
        {NULLIFIERS.map((n, i) => (<Card key={i} className="p-4 border-destructive/30"><div>{i + 1}. {n}</div></Card>))}
      </div>
    </div>
  );
}
