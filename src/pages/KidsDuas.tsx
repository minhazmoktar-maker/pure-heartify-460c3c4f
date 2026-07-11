import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Baby, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

type Dua = { id: string; occasion: string; arabic: string; translit: string; english: string; reference: string };

const DUAS: Dua[] = [
  { id: "wake", occasion: "Upon waking up", arabic: "الحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", translit: "Alḥamdu lillāhil-ladhī aḥyānā ba'da mā amātanā wa ilayhin-nushūr.", english: "Praise is for Allah who gave us life after taking it, and to Him is the return.", reference: "Bukhari 6312" },
  { id: "eat", occasion: "Before eating", arabic: "بِسْمِ اللَّهِ", translit: "Bismillāh.", english: "In the Name of Allah. (If you forget, say: Bismillāhi awwalahu wa ākhirah.)", reference: "Abu Dawud 3767" },
  { id: "afterEat", occasion: "After eating", arabic: "الحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", translit: "Alḥamdu lillāhil-ladhī aṭ'amanī hādhā wa razaqanīhi min ghayri ḥawlin minnī wa lā quwwah.", english: "Praise is for Allah who fed me this and provided it without any might or power on my part.", reference: "Tirmidhi 3458" },
  { id: "sleep", occasion: "Before sleep", arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", translit: "Bismika Allāhumma amūtu wa aḥyā.", english: "In Your Name, O Allah, I die and I live.", reference: "Bukhari 6324" },
  { id: "toilet-in", occasion: "Entering the toilet", arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ", translit: "Allāhumma innī a'ūdhu bika minal-khubthi wal-khabā'ith.", english: "O Allah, I seek refuge in You from evil male and female jinn.", reference: "Bukhari 142" },
  { id: "toilet-out", occasion: "Leaving the toilet", arabic: "غُفْرَانَكَ", translit: "Ghufrānak.", english: "I seek Your forgiveness.", reference: "Abu Dawud 30" },
  { id: "wear", occasion: "Wearing clothes", arabic: "الحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", translit: "Alḥamdu lillāhil-ladhī kasānī hādhā wa razaqanīhi min ghayri ḥawlin minnī wa lā quwwah.", english: "Praise is for Allah who clothed me with this and provided it without any might or power on my part.", reference: "Abu Dawud 4023" },
  { id: "sneeze", occasion: "When you sneeze", arabic: "الحَمْدُ لِلَّهِ", translit: "Alḥamdulillāh.", english: "Praise is for Allah. (Reply: Yarḥamuk Allāh — May Allah have mercy on you.)", reference: "Bukhari 6224" },
  { id: "car", occasion: "Riding a vehicle", arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ", translit: "Subḥānal-ladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn.", english: "Glory to Him who subjected this to us, though we could never have subjected it.", reference: "Qur'an 43:13; Muslim 1342" },
  { id: "parents", occasion: "For parents", arabic: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", translit: "Rabbir-ḥamhumā kamā rabbayānī ṣaghīrā.", english: "My Lord, have mercy on them as they raised me when I was small.", reference: "Qur'an 17:24" },
];

const KEY = "kids-duas.done";

const KidsDuas = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [q, setQ] = useState("");
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;
  const filtered = DUAS.filter(d => (d.occasion + d.english).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Du'ās for Children — Easy Sunnah Supplications to Memorize" description="Short authentic Sunnah du'ās for children to memorize — waking, eating, sleeping, toilet, dressing, sneezing, riding, and for parents." path="/kids-duas" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Baby className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Du'ās for Children</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Memorized</span><span className="text-sm font-medium">{count} / {DUAS.length}</span></div><Progress value={(count / DUAS.length) * 100} /></Card>
        <div className="flex gap-2"><Input placeholder="Search occasions…" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        {filtered.map(d => (
          <Card key={d.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [d.id]: !done[d.id] })}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="font-semibold">{d.occasion}</h2>
              {done[d.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <p className="text-2xl text-right font-arabic leading-loose mb-2">{d.arabic}</p>
            <p className="text-sm italic text-muted-foreground mb-1">{d.translit}</p>
            <p className="text-sm mb-1">{d.english}</p>
            <p className="text-xs text-muted-foreground">{d.reference}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KidsDuas;
