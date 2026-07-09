import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const CAUSES = [
  { t: "Taqwā — mindfulness of Allah", d: "Whoever fears Allah, He will make a way out and provide from where he does not expect.", ref: "Qur'an 65:2–3" },
  { t: "Istighfār — seeking forgiveness", d: "He will send rain in abundance, increase you in wealth and children, and grant you gardens and rivers.", ref: "Qur'an 71:10–12" },
  { t: "Bismillāh — beginning in Allah's name", d: "Every important matter not begun with Bismillāh is severed of blessing.", ref: "Ibn Ḥibbān 1 — Ḥasan" },
  { t: "Eating together", d: "Eat together and not apart, for barakah is in the group.", ref: "Ibn Mājah 3287 — Ḥasan" },
  { t: "Honesty in trade", d: "The two parties of a transaction have the option (khiyār) as long as they have not parted; if they are truthful and clear, blessing will be granted in their sale.", ref: "Bukhari 2079" },
  { t: "Early morning work", d: "O Allah, bless my nation in its early hours. The Prophet ﷺ sent expeditions early in the morning.", ref: "Abu Dawud 2606 — Ṣaḥīḥ" },
  { t: "Silat ar-raḥim — maintaining kinship", d: "Whoever wishes his provision be expanded and his life extended, let him maintain ties of kinship.", ref: "Bukhari 5986; Muslim 2557" },
  { t: "Charity — Ṣadaqah", d: "Charity does not decrease wealth.", ref: "Muslim 2588" },
  { t: "Tawakkul", d: "He would provide for you as He provides for the birds.", ref: "Tirmidhi 2344" },
  { t: "Recitation of Qur'an at home", d: "Do not make your houses graveyards — Satan flees from the house in which Sūrat al-Baqarah is recited.", ref: "Muslim 780" },
];
const KILLERS = [
  { t: "Ribā — interest/usury", ref: "Qur'an 2:276 — Allah destroys ribā" },
  { t: "Lying and concealing defects in sales", ref: "Bukhari 2079" },
  { t: "Sins in general — a person is deprived of provision because of a sin he commits", ref: "Ibn Mājah 4022 — Ḥasan" },
  { t: "Cutting family ties", ref: "Bukhari 5984" },
];
export default function Barakah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Barakah — Increasing Blessing in Time, Wealth, and Life" description="Ten Qur'anic and Prophetic causes of barakah — taqwā, istighfār, honesty, silat ar-raḥim, sadaqah — and the four things that destroy it." path="/barakah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><TrendingUp className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Barakah — Divine Blessing</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Causes of Barakah</h2>
        {CAUSES.map((c, i) => (<Card key={i} className="p-4"><div className="font-medium">{i + 1}. {c.t}</div><div className="text-sm mt-1">{c.d}</div><div className="text-xs text-muted-foreground mt-1">{c.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Killers of Barakah</h2>
        {KILLERS.map((k, i) => (<Card key={i} className="p-4 border-destructive/30"><div className="font-medium">{k.t}</div><div className="text-xs text-muted-foreground mt-1">{k.ref}</div></Card>))}
      </div>
    </div>
  );
}
