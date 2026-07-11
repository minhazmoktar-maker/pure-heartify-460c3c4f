import { Link } from "react-router-dom";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = [
  { v: "Your Lord has decreed that you worship none but Him and be dutiful to parents. If either or both reach old age with you, do not say to them ‘uff’, nor rebuke them, but speak to them a noble word.", ref: "Qur'an 17:23" },
  { v: "And lower to them the wing of humility out of mercy, and say: My Lord, have mercy upon them as they raised me when I was small.", ref: "Qur'an 17:24" },
  { v: "The pleasure of the Lord is in the pleasure of the parent, and the anger of the Lord is in the anger of the parent.", ref: "Tirmidhi 1899 — Ṣaḥīḥ" },
  { v: "A man asked: Who deserves my best companionship? He ﷺ said: Your mother. He asked: Then who? He ﷺ said: Your mother. Then who? Your mother. Then who? Your father.", ref: "Bukhari 5971; Muslim 2548" },
  { v: "May his nose be rubbed in dust — the man whose parents reach old age with him, one or both, yet he does not enter Paradise (by serving them).", ref: "Muslim 2551" },
  { v: "The best act of kindness is that a man maintains ties with his father's friends after his father has died.", ref: "Muslim 2552" },
  { v: "Jāhid — struggle in serving them; that is your jihad.", ref: "Bukhari 3004; Muslim 2549" },
  { v: "Undutifulness to parents is among the greatest of major sins, after shirk.", ref: "Bukhari 2654; Muslim 87" },
];
const AFTER = [
  "Pray for them: Rabbir-ḥamhumā kamā rabbayānī ṣaghīrā.",
  "Give ṣadaqah jāriyah on their behalf",
  "Fulfill any of their unfulfilled vows, debts, or fasts",
  "Honor their friends and relatives",
  "Perform ḥajj/'umrah on their behalf if they were unable",
];
export default function ParentsRights() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Birr al-Wālidayn — Rights of Parents in Islam" description="The Qur'anic and Prophetic obligations of dutifulness to parents, and how to honor them after their death." path="/parents-rights" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><HeartHandshake className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Birr al-Wālidayn — Rights of Parents</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        {ITEMS.map((x, i) => (<Card key={i} className="p-4"><div>{x.v}</div><div className="text-xs text-muted-foreground mt-1">{x.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Honoring Them After Death</h2>
        {AFTER.map((a, i) => (<Card key={i} className="p-4"><div>{i + 1}. {a}</div></Card>))}
      </div>
    </div>
  );
}
