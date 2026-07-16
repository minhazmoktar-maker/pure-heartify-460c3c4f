import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

type Step = {
  id: string;
  title: string;
  summary: string;
  body: string[];
  arabic?: string;
  translit?: string;
  translation?: string;
};

const STEPS: Step[] = [
  { id: "shahadah", title: "1. The Shahadah — your declaration", summary: "The two testimonies that make you a Muslim.",
    arabic: "أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ",
    translit: "Ash-hadu an lā ilāha illā Allāh, wa ash-hadu anna Muḥammadan rasūlu-llāh.",
    translation: "I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah.",
    body: [
      "Islam begins with a sincere heart accepting these two truths.",
      "Say it aloud in Arabic (or your own language if you cannot yet), understanding its meaning.",
      "From that moment, all past sins are erased — you begin with a clean page." ] },
  { id: "ghusl", title: "2. Ghusl — the full purification", summary: "A full-body wash to begin your life as a Muslim.",
    body: [
      "Make the intention to purify yourself for Islam.",
      "Say Bismillah, wash both hands, then private parts.",
      "Perform wudu as for prayer.",
      "Pour water over the head three times, then wash the entire body starting from the right." ] },
  { id: "wudu", title: "3. Wudu — ablution before prayer", summary: "The small purification, done before each salah when needed.",
    body: [
      "Intention in the heart, then say Bismillah.",
      "Wash hands 3× up to the wrists.",
      "Rinse mouth 3×, sniff water into nose and blow out 3×.",
      "Wash face 3× from forehead to chin, ear to ear.",
      "Wash arms 3× up to and including the elbows (right first).",
      "Wipe the head once and wipe the ears.",
      "Wash feet 3× up to and including the ankles (right first)." ] },
  { id: "salah", title: "4. Salah — the five daily prayers", summary: "The core practice: Fajr, Dhuhr, Asr, Maghrib, Isha.",
    body: [
      "Prayer keeps your connection to Allah alive throughout the day.",
      "Start by memorising Surah al-Fatihah and a short surah such as al-Ikhlas.",
      "Learn one rak'ah, then two — Fajr is a great starting point (only 2 rak'ah).",
      "Use the Prayer page in Heartify to see your local times.",
      "Don't wait until you are perfect — begin now and improve steadily." ] },
  { id: "fatiha", title: "5. Learn Surah al-Fatihah", summary: "The opening of the Qur'an, recited in every rak'ah.",
    arabic: "بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    translation: "In the name of Allah, the Most Merciful. All praise is due to Allah, Lord of all worlds… Guide us to the straight path…",
    body: [
      "Recite it slowly, listen to a reciter you love, and repeat until your tongue flows.",
      "Understanding a translation transforms every prayer." ] },
  { id: "quran", title: "6. Start reading the Qur'an", summary: "Begin with short surahs, then read a little every day.",
    body: [
      "Begin with the final juz (Juz 'Amma) — short, powerful surahs.",
      "Read a translation you trust alongside the Arabic.",
      "Consistency beats quantity: 5 minutes daily builds a lifelong habit.",
      "Use the Quran page in Heartify to bookmark and track." ] },
  { id: "duas", title: "7. Daily du'as", summary: "Short remembrances to weave through your day.",
    arabic: "بِسْمِ اللَّهِ  •  الْحَمْدُ لِلَّهِ  •  سُبْحَانَ اللَّهِ  •  اللَّهُ أَكْبَرُ",
    translation: "In the name of Allah • All praise is for Allah • Glory be to Allah • Allah is the Greatest.",
    body: [
      "Say Bismillah before eating, drinking, entering the home, and any good action.",
      "Say Alhamdulillah after finishing meals and receiving any blessing.",
      "Use the Adhkar page for morning/evening remembrances." ] },
  { id: "haram", title: "8. What to leave", summary: "The main haram categories to step away from.",
    body: [
      "Shirk — associating any partner with Allah.",
      "Pork, alcohol, and intoxicants of any kind.",
      "Interest (riba) in earning or paying.",
      "Zina and free-mixing that leads to it; modest dress for both men and women.",
      "Gambling, lying, backbiting, breaking family ties.",
      "Move at a healthy pace — sincere effort matters more than sudden perfection." ] },
  { id: "community", title: "9. Find community", summary: "You are not alone — connect with local Muslims.",
    body: [
      "Visit a local masjid — introduce yourself; you will be welcomed.",
      "Attend Jumu'ah (Friday) prayer weekly.",
      "Seek a trustworthy teacher or study circle to learn the basics correctly.",
      "Use the Mosque Finder in Heartify to locate mosques near you." ] },
  { id: "growth", title: "10. Grow steadily", summary: "Islam is a lifelong journey — pace yourself.",
    body: [
      "Set small goals: one new surah a month, one new du'a a week.",
      "Track your prayers and habits with the tools in Heartify.",
      "Ask Allah for guidance every day — He responds to the sincere seeker.",
      "Don't compare your day-1 to someone else's year-10. Just keep walking." ] },
];

const STORAGE = "heartify-newmuslim-v1";

const NewMuslim = () => {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(STEPS[0].id);

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(STORAGE) || "{}")); } catch {}
  }, []);

  const toggle = (id: string) => {
    const updated = { ...done, [id]: !done[id] };
    setDone(updated);
    localStorage.setItem(STORAGE, JSON.stringify(updated));
  };

  const completed = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  return (
    <div className="min-h-dvh bg-background pb-20">
      <SEO title="New Muslim Guide — Heartify" description="A gentle step-by-step guide for new Muslims: shahadah, wudu, salah, Fatihah, du'as, community." path="/new-muslim" />
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back"><Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-heading font-semibold">New Muslim Guide</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle>Welcome to Islam</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Take it one step at a time. Tap a step to expand, tick it off as you learn. Everything saves on this device.
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completed} / {STEPS.length}</span>
            </div>
            <Progress value={pct} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <div className="space-y-2">
          {STEPS.map((s) => {
            const isOpen = open === s.id;
            const isDone = !!done[s.id];
            return (
              <Card key={s.id} className={isDone ? "border-primary/40" : ""}>
                <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill ${isDone ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {isDone ? <Check className="h-4 w-4" /> : <span className="text-sm">{STEPS.indexOf(s) + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.summary}</div>
                  </div>
                  {isDone && <Badge variant="secondary" className="hidden sm:inline-flex">Done</Badge>}
                </button>
                {isOpen && (
                  <CardContent className="space-y-3 pt-0">
                    {s.arabic && (
                      <div className="rounded-card bg-muted p-3 text-right text-heading leading-loose" dir="rtl" lang="ar">
                        {s.arabic}
                      </div>
                    )}
                    {s.translit && <p className="text-sm italic text-muted-foreground">{s.translit}</p>}
                    {s.translation && <p className="text-sm">{s.translation}</p>}
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {s.body.map((line, idx) => <li key={idx}>{line}</li>)}
                    </ul>
                    <Button size="sm" variant={isDone ? "outline" : "default"} onClick={() => toggle(s.id)}>
                      {isDone ? "Mark as not done" : "Mark as done"}
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default NewMuslim;
