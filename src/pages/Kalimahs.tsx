import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Kalimah = { id: string; number: number; name: string; arabic: string; translit: string; meaning: string };

const KALIMAHS: Kalimah[] = [
  { id: "k1", number: 1, name: "Kalimah Tayyibah — The Word of Purity", arabic: "لَا إِلَـٰهَ إِلَّا ٱللَّهُ مُحَمَّدٌ رَّسُولُ ٱللَّهِ", translit: "La ilaha illa-Llah, Muhammadur Rasul-ullah", meaning: "There is no deity worthy of worship except Allah; Muhammad is the Messenger of Allah." },
  { id: "k2", number: 2, name: "Kalimah Shahadah — The Testimony", arabic: "أَشْهَدُ أَنْ لَا إِلَـٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", translit: "Ash-hadu an la ilaha illa-Llah, wahdahu la sharika lah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh", meaning: "I bear witness that none deserves worship but Allah alone, with no partner, and I bear witness that Muhammad is His servant and messenger." },
  { id: "k3", number: 3, name: "Kalimah Tamjeed — The Word of Glorification", arabic: "سُبْحَانَ ٱللَّهِ وَٱلْحَمْدُ لِلَّهِ وَلَا إِلَـٰهَ إِلَّا ٱللَّهُ وَٱللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ ٱلْعَلِيِّ ٱلْعَظِيمِ", translit: "SubhanAllah wal-hamdu lillah wa la ilaha illa-Llah wallahu akbar, wa la hawla wa la quwwata illa billahil-'aliyyil-'azim", meaning: "Glory be to Allah, all praise is due to Allah, none is worthy of worship but Allah, and Allah is the Greatest; there is no might nor power except with Allah, the Most High, the Most Great." },
  { id: "k4", number: 4, name: "Kalimah Tawhid — The Word of Oneness", arabic: "لَا إِلَـٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ، يُحْيِي وَيُمِيتُ ... وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", translit: "La ilaha illa-Llah wahdahu la sharika lah, lahul-mulku wa lahul-hamd, yuhyi wa yumit… wa huwa 'ala kulli shay'in qadir", meaning: "None is worthy of worship except Allah alone, with no partner. To Him belongs the dominion and to Him belongs all praise. He gives life and causes death… and He has power over all things." },
  { id: "k5", number: 5, name: "Kalimah Istighfar — The Word of Repentance", arabic: "أَسْتَغْفِرُ ٱللَّهَ رَبِّي مِنْ كُلِّ ذَنْبٍ أَذْنَبْتُهُ عَمْدًا أَوْ خَطَأً، سِرًّا أَوْ عَلَانِيَةً، وَأَتُوبُ إِلَيْهِ", translit: "Astaghfirullaha Rabbi min kulli dhambin adhnabtuhu 'amdan aw khata'an, sirran aw 'alaniyatan, wa atubu ilayh", meaning: "I seek forgiveness from Allah, my Lord, for every sin I committed knowingly or unknowingly, secretly or openly, and I turn to Him in repentance." },
  { id: "k6", number: 6, name: "Kalimah Radd al-Kufr — Rejection of Disbelief", arabic: "ٱللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ أَنْ أُشْرِكَ بِكَ شَيْئًا وَأَنَا أَعْلَمُ، وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ، تُبْتُ عَنْهُ وَتَبَرَّأْتُ مِنَ ٱلْكُفْرِ وَٱلشِّرْكِ وَٱلْمَعَاصِي كُلِّهَا، وَأَسْلَمْتُ وَآمَنْتُ وَأَقُولُ لَا إِلَـٰهَ إِلَّا ٱللَّهُ مُحَمَّدٌ رَّسُولُ ٱللَّهِ", translit: "Allahumma inni a'udhu bika an ushrika bika shay'an wa ana a'lam…", meaning: "O Allah, I seek Your refuge from associating any partner with You knowingly, and I seek forgiveness for what I do not know. I repent and disown all disbelief, polytheism, and disobedience. I submit and believe and say: none is worthy of worship but Allah; Muhammad is His Messenger." },
];

const STORAGE_KEY = "kalimahs.memorized";

const Kalimahs = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="The Six Kalimahs — Arabic, Transliteration, Meaning" description="Learn and memorize the Six Kalimahs of Islam with Arabic text, transliteration and English translation." path="/kalimahs" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><BookOpen className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">The Six Kalimahs</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Memorized</span><span className="text-sm font-medium">{count} / {KALIMAHS.length}</span></div><Progress value={(count / KALIMAHS.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        <div className="grid gap-3">{KALIMAHS.map(k => (
          <Card key={k.id} className={`p-5 cursor-pointer ${done[k.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [k.id]: !done[k.id] })}>
            <div className="flex items-start justify-between mb-3"><h3 className="font-semibold">{k.name}</h3><Badge variant="secondary">#{k.number}</Badge></div>
            <p className="text-title md:text-title text-right leading-loose mb-3 font-arabic" dir="rtl">{k.arabic}</p>
            <p className="text-sm italic text-muted-foreground mb-2">{k.translit}</p>
            <p className="text-sm">{k.meaning}</p>
          </Card>
        ))}</div>
      </div>
    </div>
  );
};

export default Kalimahs;
