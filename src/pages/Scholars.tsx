import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, GraduationCap, ShieldCheck, PlayCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";
import { useVerifiedScholars } from "@/hooks/useVerifiedScholars";
import { track } from "@/lib/analytics";

type Scholar = { id: string; name: string; era: string; field: string; summary: string; works: string };

const SCHOLARS: Scholar[] = [
  { id: "abu-hanifa", name: "Imam Abu Hanifa (d. 150 AH)", era: "8th c.", field: "Fiqh — Hanafi School", summary: "Founder of the Hanafi madhhab. Renowned for qiyas and legal reasoning. Died in prison refusing to be a judge for the caliph.", works: "Al-Fiqh al-Akbar (attributed)" },
  { id: "malik", name: "Imam Malik ibn Anas (d. 179 AH)", era: "8th c.", field: "Fiqh — Maliki School", summary: "Scholar of Madinah, considered the practice of the people of Madinah a source of law.", works: "Al-Muwatta'" },
  { id: "shafii", name: "Imam ash-Shafi'i (d. 204 AH)", era: "9th c.", field: "Fiqh — Shafi'i School", summary: "Student of Malik. First to codify usul al-fiqh as a science.", works: "Ar-Risalah; Al-Umm" },
  { id: "ahmad", name: "Imam Ahmad ibn Hanbal (d. 241 AH)", era: "9th c.", field: "Hadith & Fiqh — Hanbali School", summary: "Endured mihnah (inquisition) refusing to say the Qur'an is created. Memorized ~750,000 narrations.", works: "Al-Musnad (~28,000 hadith)" },
  { id: "bukhari", name: "Imam al-Bukhari (d. 256 AH)", era: "9th c.", field: "Hadith", summary: "Compiled the most authentic hadith collection after 16 years of scrutiny; ~7,500 narrations from 600,000.", works: "Sahih al-Bukhari" },
  { id: "muslim", name: "Imam Muslim (d. 261 AH)", era: "9th c.", field: "Hadith", summary: "Student of Bukhari. Compiled the second-most authentic collection with unparalleled organization.", works: "Sahih Muslim" },
  { id: "tabari", name: "Ibn Jarir at-Tabari (d. 310 AH)", era: "10th c.", field: "Tafsir & History", summary: "Master historian and mufassir; his tafsir is a foundation for all later works.", works: "Jami' al-Bayan (Tafsir); Tarikh al-Umam" },
  { id: "ghazali", name: "Imam al-Ghazali (d. 505 AH)", era: "11th c.", field: "Theology & Tasawwuf", summary: "Hujjat al-Islam. Revived spiritual dimensions of Islamic knowledge; refuted deviant philosophy.", works: "Ihya' 'Ulum ad-Din; Tahafut al-Falasifah" },
  { id: "ibn-taymiyyah", name: "Ibn Taymiyyah (d. 728 AH)", era: "14th c.", field: "Aqeedah & Fiqh", summary: "Shaykh al-Islam. Refuted innovation, philosophy, and Batini sects. Imprisoned repeatedly for his stances.", works: "Majmu' al-Fatawa; Al-'Aqidah al-Wasitiyyah" },
  { id: "ibn-qayyim", name: "Ibn al-Qayyim (d. 751 AH)", era: "14th c.", field: "Tazkiyah & Fiqh", summary: "Foremost student of Ibn Taymiyyah. Master of ruh (soul) and heart.", works: "Madarij as-Salikin; Zad al-Ma'ad" },
  { id: "nawawi", name: "Imam an-Nawawi (d. 676 AH)", era: "13th c.", field: "Hadith & Shafi'i Fiqh", summary: "Compiled the 40 Hadith and Riyad as-Salihin — read in every corner of the Muslim world.", works: "Al-Arba'in an-Nawawiyyah; Riyad as-Salihin; Al-Majmu'" },
  { id: "ibn-kathir", name: "Ibn Kathir (d. 774 AH)", era: "14th c.", field: "Tafsir & History", summary: "Student of Ibn Taymiyyah. His tafsir is the most widely read classical tafsir today.", works: "Tafsir al-Qur'an al-'Adhim; Al-Bidayah wan-Nihayah" },
  { id: "suyuti", name: "Jalaluddin as-Suyuti (d. 911 AH)", era: "15th c.", field: "Polymath", summary: "Authored over 500 works across every Islamic science.", works: "Tafsir al-Jalalayn (co-authored); Al-Itqan; Ad-Durr al-Manthur" },
  { id: "ibn-hajar", name: "Ibn Hajar al-'Asqalani (d. 852 AH)", era: "15th c.", field: "Hadith", summary: "Authored the definitive commentary on Sahih al-Bukhari over 25 years.", works: "Fath al-Bari; Bulugh al-Maram; At-Talkhis al-Habir" },
  { id: "ibn-abdul-wahhab", name: "Muhammad ibn Abdul-Wahhab (d. 1206 AH)", era: "18th c.", field: "Tawhid", summary: "Reformer who called back to pure tawhid in the Arabian Peninsula.", works: "Kitab at-Tawhid; Thalathat al-Usul" },
  { id: "albani", name: "Nasiruddin al-Albani (d. 1420 AH)", era: "20th c.", field: "Hadith", summary: "Renewed rigorous hadith authentication in the modern era; graded thousands of hadiths.", works: "Silsilat al-Ahadith as-Sahihah; Sahih & Da'if collections" },
];

const STORAGE_KEY = "scholars.read";

const Scholars = () => {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"classical" | "contemporary">("contemporary");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const { data: verified = [], isLoading: verifiedLoading } = useVerifiedScholars();
  const filteredClassical = useMemo(() => SCHOLARS.filter(s => !q.trim() || s.name.toLowerCase().includes(q.toLowerCase()) || s.field.toLowerCase().includes(q.toLowerCase()) || s.summary.toLowerCase().includes(q.toLowerCase())), [q]);
  const filteredVerified = useMemo(() => verified.filter(s => !q.trim() || s.display_name.toLowerCase().includes(q.toLowerCase()) || (s.affiliation ?? "").toLowerCase().includes(q.toLowerCase()) || (s.notes ?? "").toLowerCase().includes(q.toLowerCase())), [verified, q]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / SCHOLARS.length) * 100);
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Verified Scholars — Heartify" description="Contemporary and classical Islamic scholars, each vetted by Heartify's moderation team." path="/scholars" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><GraduationCap className="h-7 w-7 text-primary" /><h1 className="text-title font-bold">Scholars of Islam</h1></div>
          <p className="mt-2 text-muted-foreground">"The scholars are the inheritors of the prophets." — Abu Dawud 3641</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="inline-flex rounded-pill border bg-secondary/40 p-1">
              <button onClick={() => setTab("contemporary")} className={`rounded-pill px-3 py-1 text-sm ${tab === "contemporary" ? "bg-background font-semibold shadow-e1" : "text-muted-foreground"}`}>Contemporary · {verified.length}</button>
              <button onClick={() => setTab("classical")} className={`rounded-pill px-3 py-1 text-sm ${tab === "classical" ? "bg-background font-semibold shadow-e1" : "text-muted-foreground"}`}>Classical · {SCHOLARS.length}</button>
            </div>
            {tab === "classical" && <span className="text-sm text-muted-foreground">Read {readCount}/{SCHOLARS.length}</span>}
          </div>
          {tab === "classical" && <Progress value={pct} />}
          <div className="mt-3 flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search scholars, fields, affiliations…" className="pl-9" /></div>
            {tab === "classical" && <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>}
          </div>
        </Card>

        {tab === "contemporary" ? (
          <div className="grid gap-3">
            {verifiedLoading && <p className="text-sm text-muted-foreground">Loading verified scholars…</p>}
            {filteredVerified.map(s => (
              <Card key={s.id} id={s.id} className="p-5 hover:bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-heading font-semibold truncate">{s.display_name}</h2>
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-label="Verified" />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {s.language && <Badge variant="secondary" className="uppercase">{s.language}</Badge>}
                      {s.country && <Badge variant="outline">{s.country}</Badge>}
                      {s.affiliation && <Badge variant="outline" className="max-w-[220px] truncate">{s.affiliation}</Badge>}
                    </div>
                    {s.notes && <p className="mt-2 text-sm text-muted-foreground">{s.notes}</p>}
                    {s.aliases && s.aliases.length > 0 && (
                      <p className="mt-2 text-micro text-muted-foreground">Also known as: {s.aliases.join(" · ")}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        asChild
                        onClick={() => track("scholar.lectures_opened", { id: s.id, source: "internal_search" })}
                      >
                        <Link to={`/search?q=${encodeURIComponent(s.display_name)}`}>
                          <PlayCircle className="h-4 w-4 mr-1.5" /> Watch lectures
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {!verifiedLoading && filteredVerified.length === 0 && (
              <p className="text-sm text-muted-foreground">No scholars matched your search.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredClassical.map(s => (
              <Card key={s.id} className={`p-5 cursor-pointer transition ${read[s.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => persist({ ...read, [s.id]: !read[s.id] })}>
                <div className="flex items-start justify-between gap-4"><div><h2 className="text-heading font-semibold">{s.name}</h2><div className="mt-1 flex flex-wrap gap-2"><Badge variant="secondary">{s.era}</Badge><Badge variant="outline">{s.field}</Badge></div></div>{read[s.id] && <Badge>Read</Badge>}</div>
                <p className="mt-3 text-sm text-muted-foreground">{s.summary}</p>
                <p className="mt-2 text-micro"><span className="font-medium">Major works: </span><span className="text-muted-foreground">{s.works}</span></p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default Scholars;
