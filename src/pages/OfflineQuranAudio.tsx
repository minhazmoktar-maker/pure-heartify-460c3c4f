import { Link } from "react-router-dom";
import { ArrowLeft, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Top qurrāʾ pre-cached.', 'Bit-perfect audio integrity.', 'Bookmark āyāt offline.', 'Zero telemetry in offline mode.'];

export default function OfflineQuranAudio() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Offline Qur'an Audio — Heartify" description={'On-device recitation library.'} path="/offline-quran-audio" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Headphones className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Offline Qur'an Audio</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">On-device recitation library.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
