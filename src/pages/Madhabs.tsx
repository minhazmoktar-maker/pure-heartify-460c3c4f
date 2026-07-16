import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Scale, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Madhhab = { id: string; name: string; founder: string; years: string; region: string; methodology: string; summary: string };

const MADHABS: Madhhab[] = [
  { id: "hanafi", name: "Ḥanafī", founder: "Imām Abū Ḥanīfah al-Nu'mān", years: "80–150 AH", region: "Turkey, South Asia, Central Asia, Balkans, Egypt", methodology: "Qur'an, Sunnah, consensus (ijmā'), analogy (qiyās), juristic preference (istiḥsān), local custom ('urf).", summary: "The earliest of the four schools. Known for extensive use of ra'y (considered opinion) within the bounds of the sacred texts, and for detailed hypothetical jurisprudence." },
  { id: "maliki", name: "Mālikī", founder: "Imām Mālik ibn Anas", years: "93–179 AH", region: "North & West Africa, Sudan, Kuwait, Bahrain, parts of UAE", methodology: "Qur'an, Sunnah, practice of the people of Madinah ('amal ahl al-Madīnah), consensus, qiyās, maṣāliḥ mursalah.", summary: "Founded by the author of al-Muwaṭṭa'. Grants special weight to the living practice of Madinah as a preserved transmission from the Prophet ﷺ." },
  { id: "shafii", name: "Shāfi'ī", founder: "Imām Muḥammad ibn Idrīs al-Shāfi'ī", years: "150–204 AH", region: "Egypt, Yemen, Indonesia, Malaysia, East Africa, Kurdish regions", methodology: "Qur'an, Sunnah, ijmā', qiyās — laid the foundational framework of uṣūl al-fiqh in his al-Risālah.", summary: "The first to systematically codify legal theory. Synthesised the Ḥijāzī and Iraqi approaches." },
  { id: "hanbali", name: "Ḥanbalī", founder: "Imām Aḥmad ibn Ḥanbal", years: "164–241 AH", region: "Saudi Arabia, Qatar, parts of the Gulf", methodology: "Qur'an, Sunnah (including weak hadith preferred over analogy where necessary), fatāwā of the Ṣaḥābah, qiyās when required.", summary: "The most text-oriented school, cautious about ra'y. Strong revival through Ibn Taymiyyah and Ibn al-Qayyim." },
];

const KEY = "madhabs.done";

const Madhabs = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="The Four Madhhabs of Sunni Islam — Hanafi, Maliki, Shafi'i, Hanbali" description="Overview of the four Sunni schools of Islamic jurisprudence — their founders, methodology, and regional distribution." path="/madhabs" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Scale className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">The Four Madhhabs</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4 bg-primary/5"><p className="text-sm">All four schools are within Ahl as-Sunnah wa'l-Jamā'ah. Their differences in secondary rulings are a mercy — a Muslim follows a qualified scholar without partisanship.</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Studied</span><span className="text-sm font-medium">{count} / {MADHABS.length}</span></div><Progress value={(count / MADHABS.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        {MADHABS.map(m => (
          <Card key={m.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [m.id]: !done[m.id] })}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div><h2 className="font-semibold text-heading">{m.name}</h2><p className="text-micro text-muted-foreground">{m.founder} · {m.years}</p></div>
              {done[m.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <Badge variant="secondary" className="mb-2">{m.region}</Badge>
            <p className="text-sm mb-2"><span className="font-medium">Methodology:</span> {m.methodology}</p>
            <p className="text-sm text-muted-foreground">{m.summary}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Madhabs;
