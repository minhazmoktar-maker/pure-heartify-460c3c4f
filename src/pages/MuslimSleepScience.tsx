import { Link } from "react-router-dom";
import { ArrowLeft, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Right side, wudūʾ before bed.', 'Ayat al-Kursī + three Quls.', 'No blue-light after ʿIshāʾ.', 'Qiyām via early sleep.'];

export default function MuslimSleepScience() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muslim Sleep Science — Heartify" description={'Sunnah + science of rest.'} path="/muslim-sleep-science" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Moon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muslim Sleep Science</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Sunnah + science of rest.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
