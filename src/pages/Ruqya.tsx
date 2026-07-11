import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ShieldCheck, Sparkles, RotateCcw, Check } from "lucide-react";

type Recitation = {
  id: string;
  title: string;
  reference: string;
  arabic: string;
  translit: string;
  english: string;
  repeat: number;
  purpose: "protection" | "healing" | "sleep" | "anxiety";
};

const RECITATIONS: Recitation[] = [
  {
    id: "fatihah",
    title: "Surah Al-Fatihah",
    reference: "Qur'an 1:1-7",
    arabic:
      "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ۝ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ ۝ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ۝ مَٰلِكِ يَوْمِ ٱلدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ ۝ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
    translit: "Bismillāhi r-raḥmāni r-raḥīm...",
    english:
      "In the Name of Allah, the Most Merciful, the Especially Merciful. All praise is due to Allah, Lord of the worlds... Guide us to the straight path.",
    repeat: 7,
    purpose: "healing",
  },
  {
    id: "ayatul-kursi",
    title: "Ayat al-Kursi",
    reference: "Qur'an 2:255",
    arabic:
      "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ",
    translit: "Allāhu lā ilāha illā huwa l-ḥayyu l-qayyūm...",
    english:
      "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep...",
    repeat: 1,
    purpose: "protection",
  },
  {
    id: "baqarah-end",
    title: "Last Two Verses of Al-Baqarah",
    reference: "Qur'an 2:285-286",
    arabic:
      "ءَامَنَ ٱلرَّسُولُ بِمَآ أُنزِلَ إِلَيْهِ مِن رَّبِّهِۦ وَٱلْمُؤْمِنُونَ ۚ ...",
    translit: "Āmana r-rasūlu bimā unzila ilayhi min rabbihi wa l-mu'minūn...",
    english:
      "The Messenger has believed in what was revealed to him from his Lord, and so have the believers... Our Lord, do not impose blame upon us if we forget or make a mistake.",
    repeat: 1,
    purpose: "protection",
  },
  {
    id: "ikhlas",
    title: "Surah Al-Ikhlas",
    reference: "Qur'an 112",
    arabic:
      "قُلْ هُوَ ٱللَّهُ أَحَدٌ ۝ ٱللَّهُ ٱلصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ",
    translit: "Qul huwa Llāhu aḥad. Allāhu ṣ-ṣamad...",
    english: "Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born. Nor is there to Him any equivalent.",
    repeat: 3,
    purpose: "protection",
  },
  {
    id: "falaq",
    title: "Surah Al-Falaq",
    reference: "Qur'an 113",
    arabic:
      "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
    translit: "Qul aʿūdhu bi-rabbi l-falaq...",
    english:
      "Say: I seek refuge in the Lord of daybreak from the evil of what He has created, and from the evil of darkness when it settles, and from the evil of blowers in knots, and from the evil of an envier when he envies.",
    repeat: 3,
    purpose: "protection",
  },
  {
    id: "nas",
    title: "Surah An-Nas",
    reference: "Qur'an 114",
    arabic:
      "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ ۝ مَلِكِ ٱلنَّاسِ ۝ إِلَٰهِ ٱلنَّاسِ ۝ مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ ۝ ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ ۝ مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ",
    translit: "Qul aʿūdhu bi-rabbi n-nās...",
    english:
      "Say: I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer, who whispers in the breasts of mankind, from among the jinn and mankind.",
    repeat: 3,
    purpose: "protection",
  },
  {
    id: "shifa-dua-1",
    title: "Du'a for Healing",
    reference: "Bukhari 5750, Muslim 2191",
    arabic:
      "أَذْهِبِ الْبَأْسَ رَبَّ النَّاسِ، اشْفِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا",
    translit:
      "Adhhibi l-baʾsa Rabba n-nās, ishfi wa anta sh-Shāfī, lā shifāʾa illā shifāʾuk, shifāʾan lā yughādiru saqamā.",
    english:
      "Remove the harm, O Lord of mankind. Heal, for You are the Healer. There is no cure except Your cure — a cure that leaves no illness behind.",
    repeat: 7,
    purpose: "healing",
  },
  {
    id: "shifa-dua-2",
    title: "Du'a Placing Hand on Pain",
    reference: "Muslim 2202",
    arabic:
      "بِسْمِ اللَّهِ (٣) أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ",
    translit:
      "Bismillāh (3x). Aʿūdhu bi-llāhi wa qudratihi min sharri mā ajidu wa uḥādhir.",
    english:
      "In the Name of Allah (3x). I seek refuge in Allah and His power from the evil I feel and fear.",
    repeat: 7,
    purpose: "healing",
  },
  {
    id: "anxiety",
    title: "Du'a for Anxiety & Distress",
    reference: "Ahmad 3712, authenticated",
    arabic:
      "اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ... أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي وَنُورَ صَدْرِي",
    translit:
      "Allāhumma innī ʿabduk, ibnu ʿabdik, ibnu amatik... asʾaluka bi-kulli ismin huwa lak, an tajʿala l-Qurʾāna rabīʿa qalbī wa nūra ṣadrī.",
    english:
      "O Allah, I am Your servant, son of Your servant, son of Your maidservant. My forelock is in Your hand... I ask You by every Name that is Yours, to make the Qur'an the spring of my heart and the light of my chest.",
    repeat: 1,
    purpose: "anxiety",
  },
  {
    id: "sleep",
    title: "Before Sleep",
    reference: "Bukhari 5017",
    arabic:
      "يَقْرَأُ الْمُعَوِّذَاتِ ثُمَّ يَنْفُثُ فِي كَفَّيْهِ ثُمَّ يَمْسَحُ بِهِمَا مَا اسْتَطَاعَ مِنْ جَسَدِهِ",
    translit:
      "Recite Al-Ikhlas, Al-Falaq, An-Nas — blow into palms — wipe over the body from head down, three times.",
    english:
      "Sunnah night protection: recite the three quls, blow into the palms, and wipe over the body from head to toe, repeating three times.",
    repeat: 3,
    purpose: "sleep",
  },
];

const PURPOSE_META: Record<Recitation["purpose"], { label: string; icon: typeof Heart; color: string }> = {
  protection: { label: "Protection", icon: ShieldCheck, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  healing: { label: "Healing", icon: Heart, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  anxiety: { label: "Anxiety", icon: Sparkles, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  sleep: { label: "Sleep", icon: Sparkles, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
};

const Ruqya = () => {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"all" | Recitation["purpose"]>("all");

  const list = useMemo(
    () => (tab === "all" ? RECITATIONS : RECITATIONS.filter((r) => r.purpose === tab)),
    [tab],
  );

  const progress = useMemo(() => {
    const done = list.filter((r) => completed[r.id]).length;
    return list.length ? Math.round((done / list.length) * 100) : 0;
  }, [list, completed]);

  const toggle = (id: string) =>
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));

  const reset = () => setCompleted({});

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Helmet>
        <title>Ruqya Guide — Sunnah Spiritual Healing | Heartify</title>
        <meta
          name="description"
          content="Perform Ruqya with authentic Qur'anic verses and prophetic du'as for protection, healing, anxiety, and restful sleep."
        />
        <link rel="canonical" href="https://pure-heartify.lovable.app/ruqya" />
      </Helmet>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ruqya — Spiritual Healing</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Authentic Qur'anic recitations and prophetic supplications for protection and healing.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="shrink-0">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Session progress</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
            <p className="mt-3 text-xs text-muted-foreground">
              Suggested flow: begin with wudu, face the qiblah, recite each item the recommended number of times,
              blow lightly into your palms after each Surah, and wipe over yourself or the person seeking healing.
            </p>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="protection">Protection</TabsTrigger>
            <TabsTrigger value="healing">Healing</TabsTrigger>
            <TabsTrigger value="anxiety">Anxiety</TabsTrigger>
            <TabsTrigger value="sleep">Sleep</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-6 space-y-4">
            {list.map((r) => {
              const meta = PURPOSE_META[r.purpose];
              const Icon = meta.icon;
              const done = !!completed[r.id];
              return (
                <Card key={r.id} className={done ? "border-primary/40 bg-primary/5" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">{r.title}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">{r.reference}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary" className={meta.color}>
                          <Icon className="mr-1 h-3 w-3" />
                          {meta.label}
                        </Badge>
                        <Badge variant="outline">×{r.repeat}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p dir="rtl" lang="ar" className="text-right text-2xl leading-loose">
                      {r.arabic}
                    </p>
                    <p className="text-sm italic text-muted-foreground">{r.translit}</p>
                    <p className="text-sm">{r.english}</p>
                    <Button
                      variant={done ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggle(r.id)}
                      className="w-full"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {done ? "Completed" : "Mark as recited"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        <Card className="mt-8 border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">Important</p>
            <p>
              Ruqya is a means (sabab); healing comes from Allah alone. Continue prescribed medical treatment,
              maintain the daily adhkar (morning/evening), and avoid amulets or unknown "spiritual healers"
              who violate the Sunnah.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Ruqya;
