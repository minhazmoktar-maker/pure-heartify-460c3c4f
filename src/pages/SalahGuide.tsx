import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Step = {
  name: string;
  posture: string;
  arabic?: string;
  translit?: string;
  english: string;
  note?: string;
};

const STEPS: Step[] = [
  {
    name: "Niyyah",
    posture: "Standing, facing the qiblah",
    english: "Silently intend in your heart which prayer and how many rak'ahs you are about to perform.",
    note: "Intention is in the heart; it is not required to say it aloud.",
  },
  {
    name: "Takbiratul Ihram",
    posture: "Standing, raise hands to the ears / shoulders",
    arabic: "اللَّهُ أَكْبَرُ",
    translit: "Allahu Akbar",
    english: "Allah is the Greatest.",
    note: "This opening takbir marks entry into the prayer. Then place the right hand over the left on the chest.",
  },
  {
    name: "Opening Du'a (Istiftah)",
    posture: "Standing, hands folded",
    arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَلَا إِلَهَ غَيْرُكَ",
    translit: "Subhanaka-llahumma wa bihamdika, wa tabaraka-smuka, wa ta'ala jadduka, wa la ilaha ghayruk.",
    english: "Glory is to You, O Allah, and praise; blessed is Your name and exalted is Your majesty; there is no god but You.",
  },
  {
    name: "Ta'awwudh & Basmalah",
    posture: "Standing",
    arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ ۝ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    translit: "A'udhu billahi mina-sh-shaytani-r-rajim. Bismi-llahi-r-rahmani-r-rahim.",
    english: "I seek refuge in Allah from the accursed Shaytan. In the name of Allah, the Most Merciful, the Especially Merciful.",
  },
  {
    name: "Surah al-Fatihah",
    posture: "Standing",
    arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    translit: "Alhamdu lillahi rabbi-l-'alamin. Ar-rahmani-r-rahim. Maliki yawmi-d-din. Iyyaka na'budu wa iyyaka nasta'in. Ihdina-s-sirata-l-mustaqim. Sirata-lladhina an'amta 'alayhim ghayri-l-maghdubi 'alayhim wa la-d-dallin.",
    english: "All praise is for Allah, Lord of the worlds… Guide us to the straight path…",
    note: "End with 'Ameen' aloud in loud prayers, silently otherwise.",
  },
  {
    name: "A second surah",
    posture: "Standing",
    english: "Recite any short surah or set of verses (e.g. al-Ikhlas, al-Kafirun). Only in the first two rak'ahs.",
  },
  {
    name: "Ruku' (bowing)",
    posture: "Bow with a straight back, hands on knees",
    arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ ×3",
    translit: "Subhana rabbiya-l-'adhim (×3)",
    english: "Glory to my Lord, the Most Great.",
  },
  {
    name: "I'tidal (rising from ruku')",
    posture: "Stand upright, hands at sides",
    arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ ۝ رَبَّنَا وَلَكَ الْحَمْدُ",
    translit: "Sami'a-llahu liman hamidah. Rabbana wa laka-l-hamd.",
    english: "Allah hears the one who praises Him. Our Lord, and to You belongs all praise.",
  },
  {
    name: "Sujud (prostration)",
    posture: "Forehead, nose, palms, knees, and toes on the ground",
    arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى ×3",
    translit: "Subhana rabbiya-l-a'la (×3)",
    english: "Glory to my Lord, the Most High.",
    note: "The closest a servant is to Allah is in sujud — make personal du'a.",
  },
  {
    name: "Jalsa (sitting between sujud)",
    posture: "Sit on the left foot, right foot upright",
    arabic: "رَبِّ اغْفِرْ لِي",
    translit: "Rabbi-ghfir li",
    english: "My Lord, forgive me.",
  },
  {
    name: "Second sujud",
    posture: "Prostrate again as before",
    arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى ×3",
    translit: "Subhana rabbiya-l-a'la (×3)",
    english: "Glory to my Lord, the Most High.",
    note: "This completes one rak'ah. Stand and repeat for each subsequent rak'ah.",
  },
  {
    name: "Tashahhud (first sitting)",
    posture: "Sitting after 2nd rak'ah, right index finger raised",
    arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
    translit: "At-tahiyyatu lillahi wa-s-salawatu wa-t-tayyibat…",
    english: "All greetings, prayers, and pure words are for Allah. Peace be upon you, O Prophet…",
  },
  {
    name: "Salatul Ibrahimiyyah (final sitting)",
    posture: "Sitting on the final rak'ah",
    arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
    translit: "Allahumma salli 'ala Muhammadin wa 'ala aali Muhammad…",
    english: "O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent them upon Ibrahim…",
    note: "Follow with any personal du'a before giving salam.",
  },
  {
    name: "Tasleem",
    posture: "Sitting; turn head right, then left",
    arabic: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ",
    translit: "As-salamu 'alaykum wa rahmatullah",
    english: "Peace and mercy of Allah be upon you.",
    note: "Say it once to the right, then once to the left — this ends the prayer.",
  },
];

const PRAYERS = [
  { name: "Fajr", rakat: 2 },
  { name: "Dhuhr", rakat: 4 },
  { name: "Asr", rakat: 4 },
  { name: "Maghrib", rakat: 3 },
  { name: "Isha", rakat: 4 },
];

export default function SalahGuide() {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const pct = Math.round(((i + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-dvh bg-background text-foreground pb-20">
      <SEO
        title="How to Pray Salah — Step by Step | Heartify"
        description="A guided walkthrough of every posture and recitation in salah, from takbiratul ihram to tasleem, with Arabic, transliteration, and translation."
        path="/salah-guide"
      />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">How to Pray</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Card className="p-4">
          <div className="grid grid-cols-5 gap-2 text-center">
            {PRAYERS.map((p) => (
              <div key={p.name} className="rounded-md border border-border/60 p-2">
                <div className="text-xs font-medium">{p.name}</div>
                <div className="text-lg font-bold text-primary">{p.rakat}</div>
                <div className="text-[10px] text-muted-foreground">rak'ah</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Step {i + 1} / {STEPS.length}</span>
            <Badge variant="secondary">{step.posture}</Badge>
          </div>
          <Progress value={pct} className="mt-2 h-2" />

          <div className="mt-4">
            <h2 className="text-lg font-semibold">{step.name}</h2>
            {step.arabic && (
              <div className="mt-3 rounded-md border border-border/60 bg-muted/40 p-3">
                <div className="text-2xl leading-loose" dir="rtl" lang="ar">{step.arabic}</div>
                {step.translit && (
                  <div className="mt-2 text-sm italic text-muted-foreground">{step.translit}</div>
                )}
              </div>
            )}
            <p className="mt-3 text-sm">{step.english}</p>
            {step.note && (
              <p className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-primary">Note:</span> {step.note}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <div className="text-xs text-muted-foreground">
              {i === STEPS.length - 1 ? "End of walkthrough" : `Next: ${STEPS[i + 1].name}`}
            </div>
            <Button onClick={() => setI((x) => Math.min(STEPS.length - 1, x + 1))} disabled={i === STEPS.length - 1}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card className="p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Repetition:</strong> steps 4–11 form one rak'ah.
          After the 2nd rak'ah sit for the first tashahhud; on the final rak'ah add the
          Ibrahimiyyah and end with tasleem.
        </Card>
      </main>
    </div>
  );
}
