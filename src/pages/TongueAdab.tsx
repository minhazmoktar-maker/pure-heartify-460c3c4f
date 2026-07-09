import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const RULES = [
  { r: "Say only good, or remain silent — Bukhari 6018", cat: "Principle" },
  { r: "A slave may utter a word without weighing it, causing him to plunge into the Fire farther than east from west — Bukhari 6478", cat: "Warning" },
  { r: "Avoid ghībah (backbiting) — mentioning your brother with what he dislikes — Muslim 2589", cat: "Forbidden" },
  { r: "Avoid namīmah (tale-carrying) — the tale-bearer will not enter Paradise — Bukhari 6056", cat: "Forbidden" },
  { r: "Avoid lying — the greatest of major sins in speech — Bukhari 5976", cat: "Forbidden" },
  { r: "Avoid mockery — do not let a people mock another people; perhaps they are better — Qur'an 49:11", cat: "Forbidden" },
  { r: "Avoid arguing even when right — a house in Paradise is guaranteed to the one who leaves disputation — Abu Dawud 4800", cat: "Forbidden" },
  { r: "Do not curse — the cursing Muslim is not a shafī' (intercessor) on the Day of Resurrection — Muslim 2598", cat: "Forbidden" },
  { r: "Fulfill promises — the sign of the hypocrite is three: when he speaks he lies, when he promises he breaks it, when trusted he betrays — Bukhari 33", cat: "Obligation" },
  { r: "Guard secrets — when a man conveys a statement then turns away, it becomes a trust — Abu Dawud 4868", cat: "Obligation" },
  { r: "Greet with salām — spread it among yourselves; you will love one another — Muslim 54", cat: "Sunnah" },
  { r: "Say the best word — 'a good word is charity' — Bukhari 2989", cat: "Sunnah" },
];
export default function TongueAdab() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Adab of Speech — Guarding the Tongue in Islam" description="12 Prophetic rules for guarding the tongue: what is forbidden (ghībah, namīmah, lying, mockery), what is obligatory, and what is Sunnah." path="/tongue-adab" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><MessageCircle className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Adab of Speech</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
        {RULES.map((r, i) => (
          <Card key={i} className={`p-4 ${r.cat === "Forbidden" ? "border-destructive/30" : r.cat === "Sunnah" ? "border-primary/30" : ""}`}>
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">{r.cat}</div>
            <div className="text-sm mt-1">{r.r}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
