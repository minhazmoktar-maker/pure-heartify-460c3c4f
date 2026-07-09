import { Link } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Allah alone is ar-Razzāq (Qur'an 51:58) — every creature's provision is guaranteed.",
  "Rizq is written 40 days after conception (Bukhari 3208).",
  "Seeking asbāb (means) is Sunnah — not tawakkul without effort (Tirmidhi 2344)."
];
const S1 = [
  "Taqwā — 'Whoever fears Allah, He makes a way out and provides from where he does not expect' (Qur'an 65:2-3).",
  "Istighfār — 'Ask forgiveness — He will send heaven's rain and increase wealth' (Qur'an 71:10-12).",
  "Silat ar-raḥim — 'Whoever wants wealth and life extended, let him keep ties' (Bukhari 5986).",
  "Ṣadaqah — 'Charity does not decrease wealth' (Muslim 2588).",
  "Trust in Allah — 'If you truly relied on Allah, He would provide as He provides birds' (Tirmidhi 2344).",
  "Marriage — 'If they are poor, Allah will enrich them' (Qur'an 24:32)."
];
const S2 = [
  "Allāhumma-kfinī bi-ḥalālika 'an ḥarāmik, wa aghninī bi-faḍlika 'amman siwāk (Tirmidhi 3563).",
  "Allāhumma innī as'aluka 'ilman nāfi'an, wa rizqan ṭayyiban, wa 'amalan mutaqabbalan (Ibn Mājah 925).",
  "Recite Sūrat al-Wāqi'ah nightly — reported to guard against poverty (Bayhaqī, Shu'ab)."
];

export default function Rizq() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Rizq — Provision & Its Keys" description="Understanding rizq: Allah as ar-Razzāq, the causes that open provision, and the du'ās for barakah in wealth." path="/rizq" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Coins className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Rizq — Provision</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Foundations</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Keys that open rizq</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Du'ā for rizq</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}