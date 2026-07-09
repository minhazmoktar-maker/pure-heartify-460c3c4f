import { Link } from "react-router-dom";
import { ArrowLeft, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const SCHEDULE = [
  { time: "Before Fajr (last third)", act: "Tahajjud & extensive du'ā", ref: "Bukhari 1145" },
  { time: "Fajr in congregation", act: "2 rak'ah Sunnah at home, then Fajr in the masjid", ref: "Muslim 725" },
  { time: "After Fajr until sunrise", act: "Sits in place of prayer engaged in dhikr; then 2 rak'ah Ishrāq", ref: "Muslim 670; Tirmidhi 586" },
  { time: "Forenoon (Ḍuḥā)", act: "2–8 rak'ah Ṣalāt aḍ-Ḍuḥā", ref: "Muslim 720" },
  { time: "Zuhr", act: "4 Sunnah before, Zuhr, 2 Sunnah after — used to lengthen recitation", ref: "Muslim 730" },
  { time: "'Asr", act: "4 Sunnah before 'Asr (recommended), then the obligation", ref: "Tirmidhi 430" },
  { time: "After 'Asr", act: "Sits with companions teaching, remembering Allah until Maghrib", ref: "Muslim 670" },
  { time: "Maghrib", act: "Maghrib in congregation, 2 Sunnah after at home", ref: "Muslim 729" },
  { time: "Between Maghrib and 'Isha", act: "Recitation, family gathering, Awwābīn prayer", ref: "Tirmidhi 435" },
  { time: "'Isha", act: "'Isha delayed slightly if easy for the people, 2 Sunnah after", ref: "Muslim 638" },
  { time: "Before sleep", act: "Wudu, right side, recites Ayat al-Kursi + last 3 Quls (blowing on hands) + 33/33/34", ref: "Bukhari 6320, 5017, 3705" },
];

const ProphetDay = () => (
  <div className="min-h-screen bg-background">
    <SEO title="The Prophet's Daily Routine ﷺ — Sunnah of a Blessed Day" description="A structured hour-by-hour view of the Prophet Muhammad's ﷺ blessed daily routine — from Tahajjud to sleep — with authentic references." path="/prophet-day" />
    <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Sun className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">The Prophet's ﷺ Daily Routine</h1></div></div>
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
      {SCHEDULE.map((s, i) => (
        <Card key={i} className="p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide">{s.time}</div>
          <div className="mt-1 font-medium">{s.act}</div>
          <div className="mt-1 text-xs text-muted-foreground">{s.ref}</div>
        </Card>
      ))}
    </div>
  </div>
);
export default ProphetDay;
