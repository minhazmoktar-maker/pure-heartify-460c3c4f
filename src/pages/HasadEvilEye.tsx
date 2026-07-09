import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'The evil eye is real; if anything could outstrip qadar, it would be the evil eye' (Muslim 2188).",
  "Cause: admiration without dhikr or barakah (Bukhari, al-Adab al-Mufrad).",
  "'Whoever sees something he likes, let him make du'ā of barakah for it' (Ibn Mājah 3509)."
];
const S1 = [
  "Morning & evening adhkār — al-Ikhlāṣ, al-Falaq, an-Nās x3.",
  "Āyat al-Kursī after every fard ṣalāh.",
  "'A'ūdhu bi-kalimāti-Llāhi-t-tāmmāti min sharri mā khalaq — 3x at night (Muslim 2708)."
];
const S2 = [
  "Ruqyah with al-Fātiḥah, al-Ikhlāṣ, al-Mu'awwidhatayn on water — drink and bathe.",
  "If the striker is known, ask him to make wuḍū; wash the striker's water on the afflicted (Muwaṭṭa' 1720).",
  "No amulets or witchcraft — 'Whoever hangs an amulet has committed shirk' (Ahmad 17422)."
];

export default function HasadEvilEye() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ḥasad & 'Ayn — Envy and the Evil Eye" description="The reality of the evil eye, prevention through adhkār, and the cure through ruqyah and the water of the striker." path="/hasad-evil-eye" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ḥasad & 'Ayn</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Reality</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Protection</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Cure</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}