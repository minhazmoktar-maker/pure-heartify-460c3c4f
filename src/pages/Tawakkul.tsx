import { Link } from "react-router-dom";
import { ArrowLeft, Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = [
  { v: "And whoever relies upon Allah — He is sufficient for him.", ref: "Qur'an 65:3" },
  { v: "Upon Allah let the believers rely.", ref: "Qur'an 3:122" },
  { v: "If you relied upon Allah with true reliance, He would provide for you as He provides for the birds — they leave hungry in the morning and return full in the evening.", ref: "Tirmidhi 2344 — Ḥasan" },
  { v: "Tie your camel, then rely upon Allah.", ref: "Tirmidhi 2517" },
  { v: "Whoever says upon leaving his home: Bismillāh, tawakkaltu 'alā-llāh, wa lā ḥawla wa lā quwwata illā billāh — it is said to him: You have been guided, sufficed, and protected. The devils turn away.", ref: "Abu Dawud 5095; Tirmidhi 3426 — Ṣaḥīḥ" },
  { v: "Ḥasbunā-llāhu wa ni'mal-wakīl — Allah is sufficient for us and the best Disposer of affairs. Said by Ibrāhīm عليه السلام in the fire, and by the believers at Uḥud.", ref: "Qur'an 3:173; Bukhari 4563" },
];
const STAGES = [
  { s: "Knowledge of the Rabb — His names and attributes", d: "You cannot rely on One you do not know." },
  { s: "Affirming the means and causes", d: "Take the means without depending on them." },
  { s: "Tawḥīd of the heart", d: "Attribute the outcome to Allah alone." },
  { s: "Contentment with the decree", d: "Rest in whatever Allah has chosen." },
];
export default function Tawakkul() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Tawakkul — Reliance Upon Allah" description="The Qur'anic and Prophetic teaching on true reliance on Allah while taking the means — stages, evidences, and the du'ā of leaving home." path="/tawakkul" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Anchor className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Tawakkul — Reliance on Allah</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Evidences</h2>
        {ITEMS.map((x, i) => (<Card key={i} className="p-4"><div>{x.v}</div><div className="text-xs text-muted-foreground mt-1">{x.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Four Stages of Tawakkul</h2>
        {STAGES.map((x, i) => (<Card key={i} className="p-4"><div className="font-medium">{i + 1}. {x.s}</div><div className="text-sm mt-1">{x.d}</div></Card>))}
      </div>
    </div>
  );
}
