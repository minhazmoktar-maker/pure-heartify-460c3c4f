import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Dua = { id: string; occasion: string; arabic: string; translit: string; meaning: string; source: string; category: string };

const DUAS: Dua[] = [
  { id: "wake", occasion: "Upon waking", arabic: "ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ ٱلنُّشُورُ", translit: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur", meaning: "All praise is for Allah who gave us life after death, and to Him is the resurrection.", source: "Bukhari 6312", category: "Daily" },
  { id: "bathroom-in", occasion: "Entering the bathroom", arabic: "ٱللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ ٱلْخُبُثِ وَٱلْخَبَائِثِ", translit: "Allahumma inni a'udhu bika minal-khubuthi wal-khaba'ith", meaning: "O Allah, I seek Your protection from male and female evil beings.", source: "Bukhari 142", category: "Daily" },
  { id: "bathroom-out", occasion: "Leaving the bathroom", arabic: "غُفْرَانَكَ", translit: "Ghufranaka", meaning: "I seek Your forgiveness.", source: "Abu Dawud 30", category: "Daily" },
  { id: "wudu-after", occasion: "After wudu", arabic: "أَشْهَدُ أَنْ لَا إِلَـٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", translit: "Ash-hadu an la ilaha illa-Llah…", meaning: "I bear witness that none deserves worship but Allah alone, and Muhammad is His servant and messenger.", source: "Muslim 234", category: "Worship" },
  { id: "eating-before", occasion: "Before eating", arabic: "بِسْمِ ٱللَّهِ", translit: "Bismillah (if forgotten: Bismillahi awwalahu wa akhirah)", meaning: "In the name of Allah.", source: "Abu Dawud 3767", category: "Food" },
  { id: "eating-after", occasion: "After eating", arabic: "ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَطْعَمَنِي هَـٰذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", translit: "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah", meaning: "Praise be to Allah who fed me this and provided it for me without any might or power from me.", source: "Tirmidhi 3458", category: "Food" },
  { id: "leaving-home", occasion: "Leaving home", arabic: "بِسْمِ ٱللَّهِ، تَوَكَّلْتُ عَلَى ٱللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ", translit: "Bismillah, tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah", meaning: "In the name of Allah, I place my trust in Allah; there is no might nor power except with Allah.", source: "Abu Dawud 5095", category: "Travel" },
  { id: "entering-home", occasion: "Entering home", arabic: "بِسْمِ ٱللَّهِ وَلَجْنَا، وَبِسْمِ ٱللَّهِ خَرَجْنَا، وَعَلَى ٱللَّهِ رَبِّنَا تَوَكَّلْنَا", translit: "Bismillahi walajna, wa bismillahi kharajna, wa 'alallahi rabbina tawakkalna", meaning: "In Allah's name we enter, in Allah's name we leave, and upon our Lord we rely.", source: "Abu Dawud 5096", category: "Daily" },
  { id: "travel", occasion: "Riding / traveling", arabic: "سُبْحَانَ ٱلَّذِي سَخَّرَ لَنَا هَـٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ", translit: "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina la munqalibun", meaning: "Glory be to Him who has subjected this to us; we could not have done it. And to our Lord we shall surely return.", source: "Qur'an 43:13–14; Muslim 1342", category: "Travel" },
  { id: "distress", occasion: "In distress or grief", arabic: "لَا إِلَـٰهَ إِلَّا ٱللَّهُ ٱلْعَظِيمُ ٱلْحَلِيمُ، لَا إِلَـٰهَ إِلَّا ٱللَّهُ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ، لَا إِلَـٰهَ إِلَّا ٱللَّهُ رَبُّ ٱلسَّمَاوَاتِ وَرَبُّ ٱلْأَرْضِ وَرَبُّ ٱلْعَرْشِ ٱلْكَرِيمِ", translit: "La ilaha illa-Llahul-'azimul-halim…", meaning: "There is no god but Allah, the Great, the Forbearing…", source: "Bukhari 6346", category: "Hardship" },
  { id: "rain", occasion: "When it rains", arabic: "ٱللَّهُمَّ صَيِّبًا نَافِعًا", translit: "Allahumma sayyiban nafi'a", meaning: "O Allah, make it a beneficial rain.", source: "Bukhari 1032", category: "Weather" },
  { id: "market", occasion: "Entering the market", arabic: "لَا إِلَـٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ، يُحْيِي وَيُمِيتُ وَهُوَ حَيٌّ لَا يَمُوتُ، بِيَدِهِ ٱلْخَيْرُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", translit: "La ilaha illa-Llah wahdahu la sharika lah…", meaning: "None is worthy of worship but Allah alone… Allah records a million good deeds and erases a million sins.", source: "Tirmidhi 3428", category: "Daily" },
  { id: "anger", occasion: "When angry", arabic: "أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَانِ ٱلرَّجِيمِ", translit: "A'udhu billahi minash-shaytanir-rajim", meaning: "I seek refuge in Allah from the accursed Shaytan.", source: "Bukhari 3282", category: "Hardship" },
  { id: "debt", occasion: "For relief from debt", arabic: "ٱللَّهُمَّ ٱكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ", translit: "Allahumma-kfini bi halalika 'an haramik, wa aghnini bi fadlika 'amman siwak", meaning: "O Allah, suffice me with what You have made lawful, away from what You have made unlawful, and make me independent of all besides You by Your grace.", source: "Tirmidhi 3563", category: "Hardship" },
  { id: "sick-visit", occasion: "Visiting the sick", arabic: "لَا بَأْسَ طَهُورٌ إِنْ شَاءَ ٱللَّهُ", translit: "La ba'sa tahurun in sha Allah", meaning: "No harm, purification, if Allah wills.", source: "Bukhari 3616", category: "Health" },
  { id: "gift-thanks", occasion: "Thanking someone", arabic: "جَزَاكَ ٱللَّهُ خَيْرًا", translit: "Jazakallahu khayran", meaning: "May Allah reward you with good.", source: "Tirmidhi 2035", category: "Social" },
  { id: "before-sleep", occasion: "Before sleeping", arabic: "بِٱسْمِكَ ٱللَّهُمَّ أَمُوتُ وَأَحْيَا", translit: "Bismika Allahumma amutu wa ahya", meaning: "In Your name, O Allah, I die and I live.", source: "Bukhari 6324", category: "Daily" },
  { id: "nightmare", occasion: "After a bad dream", arabic: "أَعُوذُ بِكَلِمَاتِ ٱللَّهِ ٱلتَّامَّاتِ مِنْ غَضَبِهِ وَعِقَابِهِ وَشَرِّ عِبَادِهِ وَمِنْ هَمَزَاتِ ٱلشَّيَاطِينِ وَأَنْ يَحْضُرُونِ", translit: "A'udhu bi kalimatillahit-tammati…", meaning: "I seek refuge in Allah's perfect words from His anger, punishment, the evil of His servants, and from the whispers of the devils and their presence.", source: "Abu Dawud 3893", category: "Daily" },
  { id: "istikhara", occasion: "For guidance in a decision (Istikhara)", arabic: "ٱللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ ...", translit: "Allahumma inni astakhiruka bi 'ilmika wa astaqdiruka bi qudratika…", meaning: "O Allah, I seek Your guidance through Your knowledge and Your power through Your might…", source: "Bukhari 1162", category: "Worship" },
  { id: "parents", occasion: "For parents", arabic: "رَبِّ ٱرْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", translit: "Rabbi-rhamhuma kama rabbayani saghira", meaning: "My Lord, have mercy on them as they raised me when I was small.", source: "Qur'an 17:24", category: "Family" },
];

const STORAGE_KEY = "masnoonDuas.learned";
const CATEGORIES = ["All", "Daily", "Worship", "Food", "Travel", "Hardship", "Weather", "Health", "Social", "Family"] as const;

const MasnoonDuas = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => DUAS.filter(d => (cat === "All" || d.category === cat) && (!q.trim() || d.occasion.toLowerCase().includes(q.toLowerCase()) || d.meaning.toLowerCase().includes(q.toLowerCase()))), [q, cat]);
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Masnoon Du'as — Prophetic Supplications for Every Occasion" description="Authentic du'as from Qur'an and Sunnah for daily life: waking, sleep, food, travel, hardship, family and more." path="/masnoon-duas" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Sparkles className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Masnoon Du'as</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Learned</span><span className="text-sm font-medium">{count} / {DUAS.length}</span></div><Progress value={(count / DUAS.length) * 100} /></Card>
        <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search occasion or meaning…" className="pl-9" /></div><Button variant="outline" size="icon" aria-label="Reset" onClick={() => persist({})} title="Reset"><RotateCcw className="w-4 h-4" /></Button></div>
        <div className="flex flex-wrap gap-2">{CATEGORIES.map(c => (<Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>))}</div>
        <div className="grid gap-3">{filtered.map(d => (
          <Card key={d.id} className={`p-5 cursor-pointer ${done[d.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [d.id]: !done[d.id] })}>
            <div className="flex items-start justify-between mb-2"><h3 className="font-semibold">{d.occasion}</h3><Badge variant="secondary">{d.category}</Badge></div>
            <p className="text-heading text-right leading-loose mb-2" dir="rtl">{d.arabic}</p>
            <p className="text-sm italic text-muted-foreground mb-1">{d.translit}</p>
            <p className="text-sm mb-1">{d.meaning}</p>
            <p className="text-micro text-muted-foreground">{d.source}</p>
          </Card>
        ))}</div>
      </div>
    </div>
  );
};

export default MasnoonDuas;
