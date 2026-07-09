import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const DOS = [
  { t: "Honesty and clarity", d: "Truthful and transparent trader is with the Prophets, ṣiddīqīn, and shuhadā'.", ref: "Tirmidhi 1209" },
  { t: "Disclose defects", d: "It is not lawful for a Muslim to sell to his brother a thing with a defect except that he mentions it.", ref: "Ibn Mājah 2246 — Ṣaḥīḥ" },
  { t: "Full measure and weight", d: "Woe to the defrauders — Sūrat al-Muṭaffifīn.", ref: "Qur'an 83:1–3" },
  { t: "Kindness in business", d: "May Allah have mercy on the one who is easy when he sells, easy when he buys, and easy when he demands his rights.", ref: "Bukhari 2076" },
  { t: "Pay wages promptly", d: "Give the worker his wage before his sweat dries.", ref: "Ibn Mājah 2443 — Ḥasan" },
  { t: "Fulfill contracts", d: "O you who believe, fulfill your contracts.", ref: "Qur'an 5:1" },
  { t: "Halal earnings priority", d: "A time will come when a person will not care whether his earnings are from halal or haram.", ref: "Bukhari 2059" },
];
const DONTS = [
  { t: "Ribā (Interest/Usury)", ref: "Qur'an 2:275–276; Muslim 1598" },
  { t: "Gharar (Excessive uncertainty)", ref: "Muslim 1513" },
  { t: "Najash (Fake bidding to inflate price)", ref: "Bukhari 6963" },
  { t: "Hoarding essentials to raise price (iḥtikār)", ref: "Muslim 1605" },
  { t: "Selling something you do not own or possess", ref: "Abu Dawud 3503" },
  { t: "False oaths in sales — remove blessing", ref: "Muslim 1607" },
  { t: "Two sales in one transaction", ref: "Tirmidhi 1231" },
  { t: "Meeting caravans before market to buy cheap", ref: "Bukhari 2165" },
];
export default function BusinessEthics() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Adab at-Tijārah — Islamic Business Ethics" description="Prophetic manners of buying and selling: honesty, disclosing defects, prompt wages, forbidden practices (ribā, gharar, najash, iḥtikār)." path="/business-ethics" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Briefcase className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Adab at-Tijārah — Business Ethics</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Do</h2>
        {DOS.map((d, i) => (<Card key={i} className="p-4"><div className="font-medium">{d.t}</div><div className="text-sm mt-1">{d.d}</div><div className="text-xs text-muted-foreground mt-1">{d.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Do Not</h2>
        {DONTS.map((d, i) => (<Card key={i} className="p-4 border-destructive/30"><div className="font-medium">{d.t}</div><div className="text-xs text-muted-foreground mt-1">{d.ref}</div></Card>))}
      </div>
    </div>
  );
}
