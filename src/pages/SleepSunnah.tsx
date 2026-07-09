import { Link } from "react-router-dom";
import { ArrowLeft, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Sleep on right side, hand under cheek (Bukhari 6314).', 'Recite Āyat al-Kursī, last 3 sūrahs blown on hands.', "Wudū' before sleep.", 'Early to bed; wake for tahajjud or fajr.'];

export default function SleepSunnah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sunnah of Sleep — Heartify" description="Sunnah of Sleep: Prophetic pattern." path="/sleep-sunnah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Moon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sunnah of Sleep</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Prophetic pattern</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
