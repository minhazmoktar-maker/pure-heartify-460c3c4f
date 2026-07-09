import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const DEF = "Bid'ah in the religion is any newly invented act of worship — in belief, statement, or deed — that has no basis in the Qur'an, Sunnah, or the practice of the Ṣaḥābah, done as a means of drawing closer to Allah.";
const EVIDENCES = [
  { v: "Whoever introduces into this affair of ours something that is not from it — it is rejected.", ref: "Bukhari 2697; Muslim 1718" },
  { v: "Whoever does an action not in accordance with our matter — it is rejected.", ref: "Muslim 1718" },
  { v: "Every newly invented matter is an innovation, and every innovation is misguidance, and every misguidance is in the Fire.", ref: "Nasa'i 1578 — Ṣaḥīḥ" },
  { v: "This day I have perfected for you your religion.", ref: "Qur'an 5:3" },
  { v: "Follow, and do not innovate — for you have been sufficed.", ref: "Ibn Baṭṭah, al-Ibānah al-Kubrā" },
];
const COMMON = [
  "Celebrating birthdays as religious observances (including mawlid as an act of worship)",
  "Adding phrases to the adhān not from the Sunnah",
  "Congregational dhikr in a set voice after prayer",
  "Assigning specific days for graves visits as an act of worship",
  "Reciting al-Fātiḥah for the deceased in gatherings as a ritual",
  "Building over graves or making them places of worship",
  "Isrā' wa'l-Mi'rāj night celebrations with specific rituals",
  "Nisf Sha'bān night with specific fasting/qiyām rituals as recommended",
];
export default function Bidah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Bid'ah — Innovations to Avoid in Islam" description="Definition of bid'ah, Qur'anic and Prophetic evidences of its prohibition, and a list of common religious innovations to avoid." path="/bidah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><AlertTriangle className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Bid'ah — Religious Innovation</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <Card className="p-4 border-primary/30 bg-primary/5"><p className="text-sm">{DEF}</p></Card>
        <h2 className="font-semibold">Evidences</h2>
        {EVIDENCES.map((e, i) => (<Card key={i} className="p-4"><div>{e.v}</div><div className="text-xs text-muted-foreground mt-1">{e.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Common Innovations to Avoid</h2>
        {COMMON.map((c, i) => (<Card key={i} className="p-4 border-destructive/30"><div>{i + 1}. {c}</div></Card>))}
      </div>
    </div>
  );
}
