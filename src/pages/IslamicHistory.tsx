import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Event = { id: string; year: string; era: "Makkan" | "Madinan" | "Rashidun" | "Umayyad" | "Abbasid" | "Ottoman" | "Modern"; title: string; summary: string };

const EVENTS: Event[] = [
  { id: "birth", year: "570 CE", era: "Makkan", title: "Birth of the Prophet ﷺ", summary: "Born in Makkah in the Year of the Elephant into the tribe of Quraysh, clan of Banu Hashim." },
  { id: "revelation", year: "610 CE", era: "Makkan", title: "First Revelation", summary: "Jibril reveals the first verses of Surah al-'Alaq to the Prophet ﷺ in Cave Hira'." },
  { id: "hijra", year: "622 CE", era: "Madinan", title: "The Hijrah", summary: "Migration from Makkah to Yathrib (Madinah). Marks the start of the Hijri calendar." },
  { id: "badr", year: "624 CE", era: "Madinan", title: "Battle of Badr", summary: "First major battle. 313 Muslims defeat ~1,000 Quraysh — a divinely aided victory." },
  { id: "uhud", year: "625 CE", era: "Madinan", title: "Battle of Uhud", summary: "Setback caused by archers leaving their post. Hamza (RA) martyred. Lesson in obedience." },
  { id: "khandaq", year: "627 CE", era: "Madinan", title: "Battle of the Trench", summary: "Salman al-Farsi's trench strategy repels a 10,000-strong confederate army." },
  { id: "hudaybiyyah", year: "628 CE", era: "Madinan", title: "Treaty of Hudaybiyyah", summary: "10-year truce with Quraysh. Called 'a clear victory' — opened Arabia to Islam." },
  { id: "conquest", year: "630 CE", era: "Madinan", title: "Conquest of Makkah", summary: "The Prophet ﷺ enters Makkah peacefully, cleanses the Ka'bah of idols, and grants amnesty." },
  { id: "farewell", year: "632 CE", era: "Madinan", title: "Farewell Pilgrimage & Death", summary: "The Prophet ﷺ delivers the Farewell Sermon at Arafah, then passes away in Madinah." },
  { id: "abu-bakr", year: "632–634", era: "Rashidun", title: "Caliphate of Abu Bakr", summary: "Consolidates Arabia in the Ridda Wars. Begins compilation of the Qur'an." },
  { id: "umar-era", year: "634–644", era: "Rashidun", title: "Caliphate of Umar", summary: "Conquest of Persia, Levant, Egypt. Establishes the Hijri calendar and diwan." },
  { id: "uthman-era", year: "644–656", era: "Rashidun", title: "Caliphate of Uthman", summary: "Compiles the Qur'an into a single mushaf. Expands into North Africa and Cyprus." },
  { id: "ali-era", year: "656–661", era: "Rashidun", title: "Caliphate of Ali", summary: "Period of civil strife (fitnah). Capital moves to Kufa. Martyred in the masjid." },
  { id: "umayyad", year: "661–750", era: "Umayyad", title: "Umayyad Caliphate", summary: "Damascus capital. Islam reaches Spain (711) and the Indus. Arabic becomes the language of administration." },
  { id: "abbasid", year: "750–1258", era: "Abbasid", title: "Abbasid Golden Age", summary: "Baghdad becomes the world's center of learning. Bayt al-Hikmah, al-Ghazali, Ibn Sina, al-Khwarizmi." },
  { id: "andalus", year: "756–1492", era: "Umayyad", title: "Al-Andalus", summary: "Muslim Spain flourishes — Cordoba, Granada. Falls with the surrender of Granada in 1492." },
  { id: "salahuddin", year: "1187", era: "Abbasid", title: "Liberation of Jerusalem", summary: "Salahuddin al-Ayyubi retakes al-Quds from the Crusaders after the Battle of Hattin." },
  { id: "ottoman-rise", year: "1299", era: "Ottoman", title: "Rise of the Ottomans", summary: "Osman I founds the Ottoman state — destined to lead the ummah for 6 centuries." },
  { id: "constantinople", year: "1453", era: "Ottoman", title: "Conquest of Constantinople", summary: "Sultan Mehmed II fulfills the prophecy — the city becomes Islambul." },
  { id: "ottoman-end", year: "1924", era: "Modern", title: "Abolition of the Caliphate", summary: "The Ottoman caliphate is abolished — the ummah enters a new phase of nation-states." },
];

const STORAGE_KEY = "history.read";

const IslamicHistory = () => {
  const [q, setQ] = useState("");
  const [era, setEra] = useState<"All" | Event["era"]>("All");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => EVENTS.filter(e => (era === "All" || e.era === era) && (!q.trim() || e.title.toLowerCase().includes(q.toLowerCase()) || e.summary.toLowerCase().includes(q.toLowerCase()) || e.year.includes(q))), [q, era]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / EVENTS.length) * 100);
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic History Timeline — Heartify" description="Major events from the Prophet ﷺ through the Rashidun, Umayyad, Abbasid, Ottoman, and modern eras." path="/history" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><Clock className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Islamic History Timeline</h1></div>
          <p className="mt-2 text-muted-foreground">20 defining moments across 14 centuries of Islamic civilization.</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Read</span><span className="text-sm text-muted-foreground">{readCount} / {EVENTS.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search events…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{(["All","Makkan","Madinan","Rashidun","Umayyad","Abbasid","Ottoman","Modern"] as const).map(t => <Button key={t} size="sm" variant={era === t ? "default" : "outline"} onClick={() => setEra(t)}>{t}</Button>)}</div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(e => (
            <Card key={e.id} className={`p-5 cursor-pointer transition ${read[e.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...read, [e.id]: !read[e.id] })}>
              <div className="flex items-start justify-between gap-4">
                <div><div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-xl font-semibold">{e.title}</h2><span className="text-sm text-muted-foreground">{e.year}</span></div><Badge variant="outline" className="mt-1">{e.era}</Badge></div>
                {read[e.id] && <Badge>Read</Badge>}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{e.summary}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default IslamicHistory;
