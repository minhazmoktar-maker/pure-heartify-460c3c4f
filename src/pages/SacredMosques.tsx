import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Landmark, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Item = { id: string; name: string; location: string; reward: string; summary: string; reference: string };

const MOSQUES: Item[] = [
  { id: "haram", name: "Al-Masjid al-Ḥaram", location: "Makkah al-Mukarramah", reward: "100,000× reward per prayer", summary: "The Sacred Mosque housing the Ka'bah — the Qiblah of the Muslims and the site of Ḥajj and 'Umrah.", reference: "Ibn Majah 1406" },
  { id: "nabawi", name: "Al-Masjid an-Nabawī", location: "Al-Madinah al-Munawwarah", reward: "1,000× reward per prayer", summary: "The Prophet's ﷺ mosque, built by his own hands, containing the Rawdah between his pulpit and grave.", reference: "Bukhari 1190" },
  { id: "aqsa", name: "Al-Masjid al-Aqṣā", location: "Al-Quds (Jerusalem)", reward: "500× reward per prayer", summary: "The first Qiblah, the destination of the Isrā', and the launching point of the Mi'rāj. Its protection is a duty upon the ummah.", reference: "Qur'an 17:1; Tabarani" },
  { id: "quba", name: "Masjid Qubā'", location: "Madinah", reward: "Reward equal to an 'Umrah for one who prays 2 raka'āt after wudu at home", summary: "The first mosque built in Islam upon the Prophet's ﷺ arrival in Madinah.", reference: "Qur'an 9:108; Ibn Majah 1412" },
  { id: "qiblatain", name: "Masjid al-Qiblatayn", location: "Madinah", reward: "Historical significance", summary: "The mosque where the Qiblah was changed from Bayt al-Maqdis to the Ka'bah during a single prayer.", reference: "Qur'an 2:144" },
];

const KEY = "mosques.done";

const SacredMosques = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="The Sacred Mosques of Islam — Haram, Nabawi, Aqsa" description="The three holiest mosques and other virtuous mosques in Islam, their rewards and history from authentic sources." path="/sacred-mosques" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Landmark className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Sacred Mosques of Islam</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Learned</span><span className="text-sm font-medium">{count} / {MOSQUES.length}</span></div><Progress value={(count / MOSQUES.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        {MOSQUES.map(m => (
          <Card key={m.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [m.id]: !done[m.id] })}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div><h2 className="font-semibold text-lg">{m.name}</h2><p className="text-xs text-muted-foreground">{m.location}</p></div>
              {done[m.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <Badge className="mb-2" variant="secondary">{m.reward}</Badge>
            <p className="text-sm mb-2">{m.summary}</p>
            <p className="text-xs text-muted-foreground italic">{m.reference}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SacredMosques;
