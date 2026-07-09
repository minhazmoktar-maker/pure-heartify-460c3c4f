import { Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const RULES = [
  { r: "Walk to the masjid calmly, in a state of wudu", ref: "Bukhari 908" },
  { r: "Enter with the right foot; say: A'ūdhu billāhil-'Aẓīm wa bi-wajhihil-Karīm wa sulṭānihil-qadīm min ash-shayṭānir-rajīm. Allāhummaftaḥ lī abwāba raḥmatik.", ref: "Abu Dawud 466; Muslim 713" },
  { r: "Pray Taḥiyyatul-Masjid (2 rak'ah) before sitting", ref: "Bukhari 444" },
  { r: "Do not sell, buy, or announce lost items in the masjid", ref: "Muslim 568; Tirmidhi 1321" },
  { r: "Do not raise voices; keep phones silent — the masjid is for Qur'an, prayer, and dhikr", ref: "Muslim 285" },
  { r: "Do not step over people's necks on Friday", ref: "Abu Dawud 1118" },
  { r: "Avoid eating raw onion/garlic before attending", ref: "Muslim 564" },
  { r: "Straighten the rows and fill gaps", ref: "Bukhari 723" },
  { r: "Do not pass in front of a praying person; use a sutrah", ref: "Bukhari 510" },
  { r: "Leave with the left foot; say: Allāhumma innī as'aluka min faḍlik.", ref: "Muslim 713" },
];
const MasjidAdab = () => (
  <div className="min-h-screen bg-background">
    <SEO title="Adab al-Masjid — Etiquettes of the Mosque" description="The Sunnah manners for entering, sitting in, and leaving the masjid — with authentic references from Bukhari, Muslim, and Sunan collections." path="/masjid-adab" />
    <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Building2 className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Adab al-Masjid</h1></div></div>
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
      {RULES.map((x, i) => (<Card key={i} className="p-4"><div className="font-medium">{i + 1}. {x.r}</div><div className="mt-1 text-xs text-muted-foreground">{x.ref}</div></Card>))}
    </div>
  </div>
);
export default MasjidAdab;
