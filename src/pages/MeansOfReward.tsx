import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sun, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Deed = { id: string; title: string; detail: string; source: string };

const DEEDS: Deed[] = [
  { id: "tahajjud", title: "Pray Tahajjud in the last third", detail: "The Lord descends to the lowest heaven and calls: 'Who will call upon Me that I may answer?'", source: "Bukhari 1145" },
  { id: "istighfar-70", title: "70+ istighfar daily", detail: "The Prophet ﷺ sought forgiveness more than 70 times a day.", source: "Bukhari 6307" },
  { id: "dhikr-morning-evening", title: "Morning & evening adhkar", detail: "Fortress against sihr, evil eye, jinn and calamity.", source: "Abu Dawud 5074" },
  { id: "surah-mulk", title: "Recite Surah al-Mulk before sleep", detail: "Intercedes for its reciter until forgiven.", source: "Tirmidhi 2891" },
  { id: "duha-2rakah", title: "2 rak'ah Duha", detail: "Sadaqah for every joint of the body — 360 joints.", source: "Muslim 720" },
  { id: "monday-thursday-fast", title: "Fast Monday & Thursday", detail: "Deeds are presented to Allah on these days.", source: "Tirmidhi 747" },
  { id: "salawat-100", title: "100 salawat on the Prophet ﷺ", detail: "For every salawat, Allah sends ten blessings on you.", source: "Muslim 384" },
  { id: "sadaqah-daily", title: "A small sadaqah every day", detail: "Even a date, a smile, or removing harm from the road.", source: "Bukhari 2989" },
  { id: "read-quran-daily", title: "Daily Qur'an — even one juz", detail: "'The Qur'an will intercede for its companions on the Day of Judgment.'", source: "Muslim 804" },
  { id: "silat-rahim", title: "Uphold ties of kinship", detail: "Increases lifespan and rizq.", source: "Bukhari 5986" },
  { id: "kind-parents", title: "Serve parents daily", detail: "Paradise lies at the feet of the mother; the father is the middle gate to Paradise.", source: "Tirmidhi 1900" },
  { id: "pray-early", title: "Pray at the first time (awwal waqt)", detail: "'The most beloved deed to Allah is prayer at its earliest time.'", source: "Bukhari 527" },
  { id: "walk-to-masjid", title: "Walk to the masjid", detail: "Each step raises a degree and erases a sin.", source: "Muslim 666" },
  { id: "seek-knowledge", title: "Seek beneficial knowledge daily", detail: "'Whoever takes a path seeking knowledge, Allah eases his path to Paradise.'", source: "Muslim 2699" },
  { id: "smile", title: "Smile at your brother", detail: "'Your smile in the face of your brother is charity.'", source: "Tirmidhi 1956" },
];

const STORAGE_KEY = "meansOfReward.done";

const MeansOfReward = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Best Daily Deeds — Multipliers of Reward" description="High-yield daily deeds from Qur'an and Sunnah with authentic references." path="/means-of-reward" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Sun className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Means of Great Reward</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Practicing</span><span className="text-sm font-medium">{count} / {DEEDS.length}</span></div><Progress value={(count / DEEDS.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        <div className="grid gap-3 md:grid-cols-2">{DEEDS.map(d => (
          <Card key={d.id} className={`p-4 cursor-pointer ${done[d.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [d.id]: !done[d.id] })}>
            <div className="flex items-start justify-between mb-2"><h3 className="font-semibold">{d.title}</h3><Badge variant="secondary" className="shrink-0">{d.source}</Badge></div>
            <p className="text-sm text-muted-foreground">{d.detail}</p>
          </Card>
        ))}</div>
      </div>
    </div>
  );
};

export default MeansOfReward;
