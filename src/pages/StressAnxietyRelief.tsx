import { Link } from "react-router-dom";
import { ArrowLeft, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Du'ā' of distress: Lā ilāha illā anta subḥānaka innī kuntu min aẓ-ẓālimīn (Tirmidhi 3505).", "Tawakkul on Allah after taking means (Qur'an 65:3).", 'Regular ṣalāh reduces cortisol — clinically observed.', 'Combine faith with therapy — no contradiction.'];

export default function StressAnxietyRelief() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Stress & Anxiety in Islam — Heartify" description="Stress & Anxiety in Islam: Spiritual toolkit." path="/stress-anxiety" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <HeartPulse className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Stress & Anxiety in Islam</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Spiritual toolkit</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
