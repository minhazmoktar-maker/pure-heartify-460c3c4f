import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

type D = { id: string; title: string; arabic: string; translit: string; english: string; ref: string; count?: number };

const DUAS: D[] = [
  { id: "ayat-kursi", title: "Ayat al-Kursi (after every prayer & before sleep)", arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ ...", translit: "Allāhu lā ilāha illā Huwal-Ḥayyul-Qayyūm…", english: "Whoever recites it after every prayer, nothing prevents him from entering Paradise except death.", ref: "Nasa'i 9928 — Ṣaḥīḥ" },
  { id: "muawidhat", title: "The Three Quls x3 (morning & evening)", arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ / قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ / قُلْ أَعُوذُ بِرَبِّ النَّاسِ", translit: "Al-Ikhlāṣ + al-Falaq + an-Nās", english: "They will suffice you against everything.", ref: "Abu Dawud 5082; Tirmidhi 3575", count: 3 },
  { id: "seek-refuge", title: "Refuge from evil of what He created x3", arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", translit: "A'ūdhu bikalimātillāhit-tāmmāti min sharri mā khalaq.", english: "Nothing shall harm him that night — said in the evening.", ref: "Muslim 2708", count: 3 },
  { id: "bismillah", title: "In the Name of Allah with which nothing harms x3", arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", translit: "Bismillāhil-ladhī lā yaḍurru ma'asmihi shay'un fil-arḍi wa lā fis-samā'i wa Huwas-Samī'ul-'Alīm.", english: "Nothing shall harm him — morning & evening.", ref: "Abu Dawud 5088 — Ṣaḥīḥ", count: 3 },
  { id: "sayyid", title: "Sayyid al-Istighfār", arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ ...", translit: "Allāhumma anta Rabbī lā ilāha illā anta khalaqtanī wa anā 'abduka…", english: "Whoever says it during the day with certainty and dies that day, he is of the people of Paradise.", ref: "Bukhari 6306" },
  { id: "hasbi", title: "Ḥasbiya-llāh x7 (morning & evening)", arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", translit: "Ḥasbiya-llāhu lā ilāha illā Huwa, 'alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Aẓīm.", english: "Allah will suffice him in whatever concerns him — dunya and akhirah.", ref: "Abu Dawud 5081", count: 7 },
  { id: "shirk", title: "Refuge from shirk x1", arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أُشْرِكَ بِكَ وَأَنَا أَعْلَمُ وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ", translit: "Allāhumma innī a'ūdhu bika an ushrika bika wa anā a'lam, wa astaghfiruka limā lā a'lam.", english: "Refuge from every knowing and unknowing form of shirk.", ref: "Ahmad 19606 — Ṣaḥīḥ" },
  { id: "nightmare", title: "For a bad dream — spit dry to left x3", arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", translit: "A'ūdhu billāhi min ash-Shayṭāni-r-rajīm.", english: "Then turn to the other side; do not tell anyone.", ref: "Bukhari 6995", count: 3 },
  { id: "wake-mid", title: "If you wake in the night", arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، الْحَمْدُ لِلَّهِ وَسُبْحَانَ اللَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", translit: "Lā ilāha illa-llāh… al-ḥamdu lillāh… subḥān-allāh… allāhu akbar… lā ḥawla wa lā quwwata illā billāh.", english: "Then if he supplicates, he will be answered.", ref: "Bukhari 1154" },
  { id: "distress", title: "Du'a of Distress (Yunus عليه السلام)", arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", translit: "Lā ilāha illā anta subḥānaka innī kuntu min aẓ-ẓālimīn.", english: "No Muslim supplicates with it in any matter except Allah answers him.", ref: "Tirmidhi 3505" },
  { id: "anxiety", title: "Anxiety & Sorrow", arabic: "اللَّهُمَّ إِنِّي عَبْدُكَ ابْنُ عَبْدِكَ ابْنُ أَمَتِكَ ...", translit: "Allāhumma innī 'abduka, ibnu 'abdika, ibnu amatika…", english: "Allah will remove his sorrow and replace it with joy.", ref: "Ahmad 3712 — Ṣaḥīḥ" },
  { id: "debt", title: "Removal of Debt", arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ", translit: "Allāhumma-kfinī bi-ḥalālika 'an ḥarāmika wa aghninī bifaḍlika 'amman siwāk.", english: "Even if your debt were the size of a mountain, Allah would settle it.", ref: "Tirmidhi 3563" },
];

const KEY = "hisnul.done";
const Hisnul = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [q, setQ] = useState("");
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;
  const filtered = DUAS.filter(d => (d.title + d.english).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ḥiṣn al-Muslim — Fortress of the Muslim Protection Du'ās" description="Authentic Sunnah supplications for daily protection — Ayat al-Kursi, three Quls, refuge from shirk, distress, debt, and nightmares." path="/hisnul" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Shield className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Ḥiṣn al-Muslim — Fortress of the Muslim</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Recited today</span><span className="text-sm font-medium">{count} / {DUAS.length}</span></div><Progress value={(count / DUAS.length) * 100} /></Card>
        <div className="flex gap-2"><Input placeholder="Search protection…" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        {filtered.map(d => (
          <Card key={d.id} className={`p-4 space-y-2 ${done[d.id] ? "border-primary/50 bg-primary/5" : ""}`}>
            <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{d.title}{d.count ? ` · ×${d.count}` : ""}</h2><Button size="sm" variant={done[d.id] ? "default" : "outline"} onClick={() => persist({ ...done, [d.id]: !done[d.id] })}>{done[d.id] ? "Done" : "Mark"}</Button></div>
            <p className="text-right text-xl leading-loose" dir="rtl">{d.arabic}</p>
            <p className="italic text-sm text-muted-foreground">{d.translit}</p>
            <p className="text-sm">{d.english}</p>
            <p className="text-xs text-muted-foreground">{d.ref}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default Hisnul;
