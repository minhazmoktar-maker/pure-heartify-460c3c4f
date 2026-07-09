import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plane, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Item = { id: string; title: string; detail: string; source: string };

const ITEMS: Item[] = [
  { id: "istikhara", title: "Pray Istikhara before deciding", detail: "For any journey, especially a long or life-changing one, offer 2 rak'ahs of istikhara.", source: "Bukhari 1162" },
  { id: "settle-debts", title: "Settle rights & debts", detail: "Pay debts, return trusts, ask family for forgiveness, and write a wasiyyah if long travel.", source: "Muslim 1628" },
  { id: "travel-dua", title: "Du'a of travel", detail: "Recite 'Subhanal-ladhi sakhkhara lana hadha…' when boarding transport.", source: "Muslim 1342" },
  { id: "companions", title: "Travel with company", detail: "'A single rider is a Shaytan; two riders are two Shaytans; three are a company.'", source: "Abu Dawud 2607" },
  { id: "leader", title: "Appoint a leader", detail: "When three or more travel, one should be appointed amir.", source: "Abu Dawud 2608" },
  { id: "qasr", title: "Shorten prayers (qasr)", detail: "Once outside the city limits and the journey exceeds ~78 km, shorten 4-rak'ah prayers to 2." },
  { id: "jam", title: "Combine prayers (jam')", detail: "Permissible to combine Dhuhr with Asr, and Maghrib with Isha, in taqdim or takhir." },
  { id: "fasting", title: "Fasting concession", detail: "The traveler may break the fast and make up the days later — whichever is easier." },
  { id: "friday", title: "Friday prayer waived", detail: "Jumu'ah is not obligatory on a traveler, but if he attends a masjid it counts." },
  { id: "seek-good", title: "Seek good in destination", detail: "Say the du'a for entering a new town: 'Allahumma Rabba as-samawati as-sab'…'", source: "Nasa'i 8827" },
  { id: "return", title: "Return du'a and gift", detail: "On returning, pray 2 rak'ahs at the masjid before going home; bring a small gift for family.", source: "Bukhari 3088" },
  { id: "avoid-night-arrival", title: "Avoid surprise night arrival", detail: "Do not enter your home unexpectedly at night; inform family of your arrival.", source: "Bukhari 5244" },
];

const STORAGE_KEY = "travelAdab.done";

const TravelAdab = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Travel Etiquette & Rulings in Islam" description="Sunnah of travel: qasr, jam', du'as, companions, and the fiqh of the traveler." path="/travel-adab" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Plane className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Travel Adab & Fiqh</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Reviewed</span><span className="text-sm font-medium">{count} / {ITEMS.length}</span></div><Progress value={(count / ITEMS.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        <div className="grid gap-3 md:grid-cols-2">{ITEMS.map(i => (
          <Card key={i.id} className={`p-4 cursor-pointer ${done[i.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [i.id]: !done[i.id] })}>
            <div className="flex items-start justify-between mb-2"><h3 className="font-semibold">{i.title}</h3>{i.source && <Badge variant="secondary" className="ml-2 shrink-0">{i.source}</Badge>}</div>
            <p className="text-sm text-muted-foreground">{i.detail}</p>
          </Card>
        ))}</div>
      </div>
    </div>
  );
};

export default TravelAdab;
