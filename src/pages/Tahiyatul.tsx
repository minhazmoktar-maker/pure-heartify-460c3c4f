import { Link } from "react-router-dom";
import { ArrowLeft, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Sunnah mu'akkadah on entering any masjid (Bukhari 444).",
  "Even if the khaṭīb is delivering the Jumu'ah khuṭbah — Prophet ﷺ told Sulayk to stand and pray two short rak'ah (Bukhari 931).",
  "Not required at Masjid al-Ḥarām — ṭawāf is its greeting."
];
const S1 = [
  "Two rak'ah, light and quick.",
  "Intention: greeting of the masjid, or combine with fajr sunnah / any other prayer.",
  "If iqāmah has been called, join the jamā'ah — no separate taḥiyyah."
];

export default function Tahiyatul() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Taḥiyyat al-Masjid — Greeting the Masjid" description="'When one of you enters the masjid, let him not sit until he prays two rak'ah.'" path="/tahiyat-al-masjid" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <DoorOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Taḥiyyat al-Masjid</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Ruling</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">How</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}