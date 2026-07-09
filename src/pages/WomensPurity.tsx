import { Link } from "react-router-dom";
import { ArrowLeft, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SEO from "@/components/SEO";

const HAYD = {
  def: "Ḥayḍ — natural monthly bleeding from a healthy woman. Minimum 1 day; maximum 15 days (majority view).",
  prohibited: [
    "Ṣalāh (prayer) — not performed and not made up",
    "Fasting — not performed; obligatory fasts must be made up later",
    "Ṭawāf around the Ka'bah",
    "Touching the muṣḥaf (most scholars)",
    "Reciting Qur'an aloud (differed opinions; safer to avoid)",
    "Entering the masjid to sit",
    "Intercourse — Qur'an 2:222; anything else with the wife is permitted (Muslim 302)",
    "Ṭalāq (divorce) during ḥayḍ is prohibited (Bukhari 5251)",
  ],
  end: "When she sees the qaṣṣah bayḍā' (white discharge) or complete dryness. She then performs ghusl and resumes worship.",
};
const NIFAS = {
  def: "Nifās — post-natal bleeding after childbirth. Maximum 40 days by the majority (Abu Dawud 311).",
  ruling: "Same rulings as ḥayḍ: no prayer, fasting, ṭawāf, intercourse. When bleeding stops before 40 days, she makes ghusl and resumes worship.",
};
const ISTIH = {
  def: "Istiḥāḍah — non-menstrual bleeding (illness). It is NOT ḥayḍ.",
  ruling: "She prays and fasts. Makes wudu for each prayer's time and prays. Intercourse is permitted (Bukhari 306). If she has a known ḥayḍ pattern, she treats those days as ḥayḍ; otherwise she distinguishes by the qualities of the blood or takes the ghālib of women (6–7 days).",
};

export default function WomensPurity() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Fiqh of Ḥayḍ, Nifās & Istiḥāḍah — Women's Purity in Islam" description="A concise, evidence-based guide to menstruation, post-natal bleeding, and irregular bleeding in Islam — with rulings on prayer, fasting, and ghusl." path="/womens-purity" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Droplets className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Women's Purity</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Tabs defaultValue="hayd">
          <TabsList className="grid grid-cols-3 w-full"><TabsTrigger value="hayd">Ḥayḍ</TabsTrigger><TabsTrigger value="nifas">Nifās</TabsTrigger><TabsTrigger value="istih">Istiḥāḍah</TabsTrigger></TabsList>
          <TabsContent value="hayd" className="space-y-4 mt-4">
            <Card className="p-4"><div className="font-semibold">Definition</div><p className="text-sm mt-1">{HAYD.def}</p></Card>
            <Card className="p-4"><div className="font-semibold mb-2">Prohibited During Ḥayḍ</div><ul className="text-sm space-y-1 list-disc pl-5">{HAYD.prohibited.map((p,i)=><li key={i}>{p}</li>)}</ul></Card>
            <Card className="p-4"><div className="font-semibold">When It Ends</div><p className="text-sm mt-1">{HAYD.end}</p></Card>
          </TabsContent>
          <TabsContent value="nifas" className="space-y-4 mt-4">
            <Card className="p-4"><div className="font-semibold">Definition</div><p className="text-sm mt-1">{NIFAS.def}</p></Card>
            <Card className="p-4"><div className="font-semibold">Ruling</div><p className="text-sm mt-1">{NIFAS.ruling}</p></Card>
          </TabsContent>
          <TabsContent value="istih" className="space-y-4 mt-4">
            <Card className="p-4"><div className="font-semibold">Definition</div><p className="text-sm mt-1">{ISTIH.def}</p></Card>
            <Card className="p-4"><div className="font-semibold">Ruling</div><p className="text-sm mt-1">{ISTIH.ruling}</p></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
