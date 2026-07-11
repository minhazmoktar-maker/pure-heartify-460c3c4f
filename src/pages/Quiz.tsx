import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Brain, Check, X, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

type Q = { q: string; choices: string[]; answer: number; category: "Aqeedah" | "Seerah" | "Fiqh" | "Qur'an" | "Hadith"; explain?: string };

const BANK: Q[] = [
  { category: "Aqeedah", q: "How many pillars of Iman are there?", choices: ["5", "6", "7", "4"], answer: 1, explain: "Belief in Allah, Angels, Books, Messengers, Last Day, and Qadar." },
  { category: "Aqeedah", q: "How many pillars of Islam are there?", choices: ["4", "5", "6", "7"], answer: 1 },
  { category: "Aqeedah", q: "The concept of Tawheed means…", choices: ["Charity", "Oneness of Allah", "Prophethood", "Prayer"], answer: 1 },
  { category: "Seerah", q: "In which city was Prophet Muhammad ﷺ born?", choices: ["Madinah", "Ta'if", "Makkah", "Jerusalem"], answer: 2 },
  { category: "Seerah", q: "At what age did the Prophet ﷺ receive the first revelation?", choices: ["25", "35", "40", "45"], answer: 2 },
  { category: "Seerah", q: "Who was the first male to accept Islam?", choices: ["Umar", "Abu Bakr", "Ali", "Uthman"], answer: 1 },
  { category: "Seerah", q: "Who was the first female to accept Islam?", choices: ["Aisha", "Fatimah", "Khadijah", "Zainab"], answer: 2 },
  { category: "Seerah", q: "The Hijrah was from Makkah to…", choices: ["Ta'if", "Abyssinia", "Madinah", "Yemen"], answer: 2 },
  { category: "Fiqh", q: "How many rak'ahs is Fajr prayer?", choices: ["2", "3", "4", "5"], answer: 0 },
  { category: "Fiqh", q: "How many rak'ahs is Maghrib?", choices: ["2", "3", "4", "5"], answer: 1 },
  { category: "Fiqh", q: "Zakat is generally paid at what rate on wealth?", choices: ["1%", "2.5%", "5%", "10%"], answer: 1 },
  { category: "Fiqh", q: "Fasting Ramadan is which pillar of Islam?", choices: ["2nd", "3rd", "4th", "5th"], answer: 2 },
  { category: "Fiqh", q: "Wudu is invalidated by…", choices: ["Sleeping deeply", "Reading Qur'an", "Walking", "Smiling"], answer: 0 },
  { category: "Qur'an", q: "How many surahs are in the Qur'an?", choices: ["100", "110", "114", "120"], answer: 2 },
  { category: "Qur'an", q: "Which surah is called 'the heart of the Qur'an'?", choices: ["Al-Fatihah", "Ya-Sin", "Al-Baqarah", "Al-Ikhlas"], answer: 1 },
  { category: "Qur'an", q: "The longest surah in the Qur'an is…", choices: ["Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah"], answer: 0 },
  { category: "Qur'an", q: "The shortest surah is…", choices: ["Al-Kawthar", "Al-Ikhlas", "An-Nas", "Al-Asr"], answer: 0 },
  { category: "Qur'an", q: "In which month was the Qur'an revealed?", choices: ["Rajab", "Sha'ban", "Ramadan", "Muharram"], answer: 2 },
  { category: "Hadith", q: "Sahih al-Bukhari was compiled by…", choices: ["Imam Muslim", "Imam al-Bukhari", "Imam Malik", "Imam Ahmad"], answer: 1 },
  { category: "Hadith", q: "'Actions are but by intentions' is narrated by…", choices: ["Abu Hurairah", "Umar ibn al-Khattab", "Ali", "Ibn Abbas"], answer: 1 },
];

const CATS = ["All", "Aqeedah", "Seerah", "Fiqh", "Qur'an", "Hadith"] as const;
type Cat = typeof CATS[number];

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const STORAGE = "heartify-quiz-best-v1";

const Quiz = () => {
  const [cat, setCat] = useState<Cat>("All");
  const [deck, setDeck] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState<Record<string, number>>({});

  useEffect(() => {
    try { setBest(JSON.parse(localStorage.getItem(STORAGE) || "{}")); } catch {}
  }, []);

  const start = (c: Cat) => {
    setCat(c);
    const pool = c === "All" ? BANK : BANK.filter((q) => q.category === c);
    setDeck(shuffle(pool).slice(0, Math.min(10, pool.length)));
    setI(0); setPicked(null); setScore(0); setDone(false);
  };

  const current = deck[i];
  const pct = deck.length ? Math.round((i / deck.length) * 100) : 0;

  const pick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === current.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (i + 1 >= deck.length) {
      setDone(true);
      const key = cat;
      const finalScore = score + (picked === current.answer ? 0 : 0);
      const prev = best[key] ?? 0;
      const now = score; // score already reflects the last pick
      if (now > prev) {
        const updated = { ...best, [key]: now };
        setBest(updated);
        localStorage.setItem(STORAGE, JSON.stringify(updated));
      }
    } else {
      setI(i + 1); setPicked(null);
    }
  };

  const reset = () => setDeck([]);

  const percent = useMemo(() => deck.length ? Math.round((score / deck.length) * 100) : 0, [score, deck.length]);

  return (
    <div className="min-h-dvh bg-background pb-20">
      <SEO title="Islamic Quiz — Heartify" description="Quick 10-question Islamic quizzes across Aqeedah, Seerah, Fiqh, Qur'an and Hadith." path="/quiz" />
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back"><Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Islamic Quiz</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {deck.length === 0 && (
          <Card>
            <CardHeader><CardTitle>Pick a category</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {CATS.map((c) => (
                <Button key={c} variant="outline" className="justify-between h-auto py-3" onClick={() => start(c)}>
                  <span>{c}</span>
                  {best[c] !== undefined && <Badge variant="secondary"><Trophy className="mr-1 h-3 w-3" />{best[c]}</Badge>}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {deck.length > 0 && !done && current && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{current.category}</Badge>
                <span className="text-sm text-muted-foreground">Q {i + 1} / {deck.length}</span>
              </div>
              <Progress value={pct} className="mt-2 h-1.5" />
              <CardTitle className="pt-4 text-xl leading-snug">{current.q}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {current.choices.map((c, idx) => {
                const isRight = picked !== null && idx === current.answer;
                const isWrongPick = picked === idx && idx !== current.answer;
                return (
                  <button
                    key={idx}
                    onClick={() => pick(idx)}
                    disabled={picked !== null}
                    className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition ${
                      isRight ? "border-primary bg-primary/10" : isWrongPick ? "border-destructive bg-destructive/10" : "hover:bg-accent"
                    }`}
                  >
                    <span>{c}</span>
                    {isRight && <Check className="h-4 w-4 text-primary" />}
                    {isWrongPick && <X className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
              {picked !== null && (
                <>
                  {current.explain && <p className="rounded-md bg-muted p-3 text-sm">{current.explain}</p>}
                  <Button onClick={next} className="w-full">{i + 1 >= deck.length ? "See results" : "Next question"}</Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {done && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Results</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-center">
              <div className="text-5xl font-bold">{score}<span className="text-2xl text-muted-foreground">/{deck.length}</span></div>
              <p className="text-muted-foreground">{percent}% — {percent >= 80 ? "Masha'Allah, excellent!" : percent >= 50 ? "Good effort — keep learning." : "Keep going — every step counts."}</p>
              <div className="flex justify-center gap-2 pt-2">
                <Button onClick={() => start(cat)}><RotateCcw className="mr-2 h-4 w-4" />Play again</Button>
                <Button variant="outline" onClick={reset}>Change category</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Quiz;
