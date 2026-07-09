import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const SIGNS = [
  { s: "You fear that your deeds might be rejected (as the righteous predecessors feared)", ref: "Qur'an 23:60; Tirmidhi 3175" },
  { s: "You prefer hidden acts of worship over public ones", ref: "Bukhari 1423 — the seven under the Shade" },
  { s: "You do not seek praise, and are not affected by criticism when you are upon truth", ref: "Fudayl b. 'Iyāḍ, cited in Iḥyā'" },
  { s: "You are the same in private as you are in public", ref: "Ibn al-Qayyim, Madārij as-Sālikīn" },
  { s: "You accept truth from anyone, even from the one you dislike", ref: "Ibn Taymiyyah, Majmū' al-Fatāwā 10/600" },
  { s: "You do not delay a good deed hoping for a bigger audience", ref: "Ibn Rajab, Jāmi' al-'Ulūm wal-Ḥikam" },
  { s: "You give sadaqah in a way that even the recipient does not know you", ref: "Bukhari 1423" },
  { s: "You continue an act of worship even when no one is watching or praising", ref: "Ibn al-Qayyim, al-Fawā'id" },
];
const RIYA = [
  { s: "Acting more devoutly when others are watching", ref: "Muslim 2985 — hadith of Abu Sa'id" },
  { s: "Lengthening prayer only in the presence of guests", ref: "Bukhari 6499" },
  { s: "Speaking with false humility to be called humble", ref: "al-Ghazālī, Iḥyā' 3/298" },
  { s: "Wanting praise for a deed already accepted by Allah — Riya' is the hidden shirk.", ref: "Ahmad 23630 — Ṣaḥīḥ" },
];

const Ikhlas = () => (
  <div className="min-h-screen bg-background">
    <SEO title="Ikhlāṣ — Signs of Sincerity and Warnings of Riya'" description="Authentic signs of a sincere heart, and warnings against showing off (riya' — the hidden shirk), drawn from Qur'an, Sunnah, and the salaf." path="/ikhlas" />
    <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Heart className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Ikhlāṣ — Sincerity of Intention</h1></div></div>
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
      <Card className="p-4 border-primary/30 bg-primary/5"><p className="text-sm">"Deeds are only by intentions, and every person shall have what he intended." — Bukhari 1; Muslim 1907.</p></Card>
      <h2 className="font-semibold">Signs of Ikhlāṣ</h2>
      {SIGNS.map((x, i) => (<Card key={i} className="p-4"><div>{i + 1}. {x.s}</div><div className="mt-1 text-xs text-muted-foreground">{x.ref}</div></Card>))}
      <h2 className="font-semibold pt-4">Warnings against Riya'</h2>
      {RIYA.map((x, i) => (<Card key={i} className="p-4 border-destructive/30"><div>{x.s}</div><div className="mt-1 text-xs text-muted-foreground">{x.ref}</div></Card>))}
    </div>
  </div>
);
export default Ikhlas;
