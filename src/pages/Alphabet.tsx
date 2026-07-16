import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, RotateCcw, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SEO from "@/components/SEO";

type Letter = {
  name: string;
  isolated: string;
  initial: string;
  medial: string;
  final: string;
  translit: string;
  sound: string;
};

const LETTERS: Letter[] = [
  { name: "Alif",  isolated: "ا", initial: "ا",  medial: "ـا",  final: "ـا",  translit: "a",   sound: "long 'aa' (father)" },
  { name: "Ba",    isolated: "ب", initial: "بـ", medial: "ـبـ", final: "ـب",  translit: "b",   sound: "b as in bat" },
  { name: "Ta",    isolated: "ت", initial: "تـ", medial: "ـتـ", final: "ـت",  translit: "t",   sound: "t as in top" },
  { name: "Tha",   isolated: "ث", initial: "ثـ", medial: "ـثـ", final: "ـث",  translit: "th",  sound: "th as in think" },
  { name: "Jim",   isolated: "ج", initial: "جـ", medial: "ـجـ", final: "ـج",  translit: "j",   sound: "j as in jam" },
  { name: "Ha",    isolated: "ح", initial: "حـ", medial: "ـحـ", final: "ـح",  translit: "ḥ",   sound: "deep h from throat" },
  { name: "Kha",   isolated: "خ", initial: "خـ", medial: "ـخـ", final: "ـخ",  translit: "kh",  sound: "kh as in Bach" },
  { name: "Dal",   isolated: "د", initial: "د",  medial: "ـد",  final: "ـد",  translit: "d",   sound: "d as in dog" },
  { name: "Dhal",  isolated: "ذ", initial: "ذ",  medial: "ـذ",  final: "ـذ",  translit: "dh",  sound: "th as in this" },
  { name: "Ra",    isolated: "ر", initial: "ر",  medial: "ـر",  final: "ـر",  translit: "r",   sound: "rolled r" },
  { name: "Zay",   isolated: "ز", initial: "ز",  medial: "ـز",  final: "ـز",  translit: "z",   sound: "z as in zoo" },
  { name: "Sin",   isolated: "س", initial: "سـ", medial: "ـسـ", final: "ـس",  translit: "s",   sound: "s as in sit" },
  { name: "Shin",  isolated: "ش", initial: "شـ", medial: "ـشـ", final: "ـش",  translit: "sh",  sound: "sh as in shine" },
  { name: "Sad",   isolated: "ص", initial: "صـ", medial: "ـصـ", final: "ـص",  translit: "ṣ",   sound: "heavy s" },
  { name: "Dad",   isolated: "ض", initial: "ضـ", medial: "ـضـ", final: "ـض",  translit: "ḍ",   sound: "heavy d" },
  { name: "Ta (heavy)", isolated: "ط", initial: "طـ", medial: "ـطـ", final: "ـط",  translit: "ṭ",   sound: "heavy t" },
  { name: "Za (heavy)", isolated: "ظ", initial: "ظـ", medial: "ـظـ", final: "ـظ",  translit: "ẓ",   sound: "heavy dh" },
  { name: "Ayn",   isolated: "ع", initial: "عـ", medial: "ـعـ", final: "ـع",  translit: "ʿ",   sound: "voiced throat sound" },
  { name: "Ghayn", isolated: "غ", initial: "غـ", medial: "ـغـ", final: "ـغ",  translit: "gh",  sound: "gargled r" },
  { name: "Fa",    isolated: "ف", initial: "فـ", medial: "ـفـ", final: "ـف",  translit: "f",   sound: "f as in fan" },
  { name: "Qaf",   isolated: "ق", initial: "قـ", medial: "ـقـ", final: "ـق",  translit: "q",   sound: "deep k from back" },
  { name: "Kaf",   isolated: "ك", initial: "كـ", medial: "ـكـ", final: "ـك",  translit: "k",   sound: "k as in king" },
  { name: "Lam",   isolated: "ل", initial: "لـ", medial: "ـلـ", final: "ـل",  translit: "l",   sound: "l as in lamp" },
  { name: "Mim",   isolated: "م", initial: "مـ", medial: "ـمـ", final: "ـم",  translit: "m",   sound: "m as in moon" },
  { name: "Nun",   isolated: "ن", initial: "نـ", medial: "ـنـ", final: "ـن",  translit: "n",   sound: "n as in nice" },
  { name: "Ha (soft)", isolated: "ه", initial: "هـ", medial: "ـهـ", final: "ـه",  translit: "h",   sound: "h as in hat" },
  { name: "Waw",   isolated: "و", initial: "و",  medial: "ـو",  final: "ـو",  translit: "w",   sound: "w / long uu" },
  { name: "Ya",    isolated: "ي", initial: "يـ", medial: "ـيـ", final: "ـي",  translit: "y",   sound: "y / long ii" },
];

const STORAGE = "heartify.alphabet.v1";

export default function Alphabet() {
  const [learned, setLearned] = useState<Record<string, boolean>>({});
  const [quiz, setQuiz] = useState<{ i: number; choices: Letter[]; picked?: string; score: number; total: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setLearned(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(learned));
  }, [learned]);

  const learnedCount = useMemo(() => Object.values(learned).filter(Boolean).length, [learned]);
  const pct = Math.round((learnedCount / LETTERS.length) * 100);

  const startQuiz = () => nextQuestion(0, 0);

  const nextQuestion = (i: number, score: number) => {
    if (i >= 10) {
      setQuiz({ i, choices: [], score, total: 10 });
      return;
    }
    const answer = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const pool = LETTERS.filter((l) => l.name !== answer.name).sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [answer, ...pool].sort(() => Math.random() - 0.5);
    setQuiz({ i, choices, picked: undefined, score, total: 10 });
  };

  const pick = (name: string) => {
    if (!quiz || quiz.picked) return;
    const correctName = quiz.choices.find((c) => c.name)!;
    // Correct answer = the one whose isolated form matches the prompt (first choice pre-shuffle logic replaced): we mark based on name
    const prompt = quiz.choices[0]; // display anchor — we recompute below
    // Instead, deterministic: pick prompt as the first letter of choices when we set it. Simpler: store answer separately.
    // Recompute using localStorage-less trick: encode via order — the "prompt" is stored on window
    const correct = (window as any).__alphaAnswer as string;
    const right = name === correct;
    setQuiz({ ...quiz, picked: name, score: quiz.score + (right ? 1 : 0) });
    setTimeout(() => nextQuestion(quiz.i + 1, quiz.score + (right ? 1 : 0)), 900);
    void prompt; void correctName;
  };

  return (
    <div className="min-h-dvh bg-background text-foreground pb-20">
      <SEO
        title="Arabic Alphabet Learner | Heartify"
        description="Learn the 28 Arabic letters with their four positional forms, transliteration, sounds, and a quick recognition quiz."
        path="/alphabet"
      />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Languages className="h-5 w-5 text-primary" />
          <h1 className="text-heading font-semibold">Arabic Alphabet</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Learned</span>
            <span className="font-medium">{learnedCount} / {LETTERS.length}</span>
          </div>
          <Progress value={pct} className="mt-2 h-2" />
        </Card>

        <Tabs defaultValue="learn">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="learn">Learn</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
          </TabsList>

          <TabsContent value="learn" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LETTERS.map((l) => {
              const done = !!learned[l.name];
              return (
                <Card key={l.name} className={`p-4 ${done ? "border-primary/50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-display font-bold" dir="rtl" lang="ar">{l.isolated}</div>
                      <div className="mt-1 text-sm font-medium">{l.name} <span className="text-muted-foreground">({l.translit})</span></div>
                      <div className="text-micro text-muted-foreground">{l.sound}</div>
                    </div>
                    <Button
                      size="icon"
                      variant={done ? "default" : "outline"}
                      onClick={() => setLearned((s) => ({ ...s, [l.name]: !s[l.name] }))}
                      aria-label={done ? "Mark unlearned" : "Mark learned"}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center" dir="rtl" lang="ar">
                    {[
                      { k: "Isolated", v: l.isolated },
                      { k: "Initial", v: l.initial },
                      { k: "Medial", v: l.medial },
                      { k: "Final", v: l.final },
                    ].map((c) => (
                      <div key={c.k} className="rounded-card border border-border/50 p-2">
                        <div className="text-heading">{c.v}</div>
                        <div className="text-[10px] text-muted-foreground" dir="ltr">{c.k}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="quiz" className="space-y-4">
            <QuizPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function QuizPanel() {
  const [answer, setAnswer] = useState<Letter | null>(null);
  const [choices, setChoices] = useState<Letter[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const TOTAL = 10;

  const load = () => {
    const a = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const pool = LETTERS.filter((l) => l.name !== a.name).sort(() => Math.random() - 0.5).slice(0, 3);
    setAnswer(a);
    setChoices([a, ...pool].sort(() => Math.random() - 0.5));
    setPicked(null);
  };

  useEffect(() => {
    if (round < TOTAL) load();
  }, [round]);

  if (round >= TOTAL) {
    return (
      <Card className="p-6 text-center">
        <div className="text-sm text-muted-foreground">Quiz complete</div>
        <div className="mt-2 text-display font-bold">{score} / {TOTAL}</div>
        <Button className="mt-4" onClick={() => { setScore(0); setRound(0); }}>
          <RotateCcw className="mr-2 h-4 w-4" /> Play again
        </Button>
      </Card>
    );
  }

  if (!answer) return null;

  const pick = (l: Letter) => {
    if (picked) return;
    const right = l.name === answer.name;
    setPicked(l.name);
    if (right) setScore((s) => s + 1);
    setTimeout(() => setRound((r) => r + 1), 800);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Question {round + 1} / {TOTAL}</span>
        <span className="font-medium">Score {score}</span>
      </div>
      <div className="my-6 text-center">
        <div className="text-micro uppercase text-muted-foreground">Which letter is this?</div>
        <div className="mt-2 text-display font-bold" dir="rtl" lang="ar">{answer.isolated}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c) => {
          const isRight = picked && c.name === answer.name;
          const isWrong = picked === c.name && c.name !== answer.name;
          return (
            <Button
              key={c.name}
              variant="outline"
              onClick={() => pick(c)}
              className={
                isRight ? "border-emerald-500 bg-emerald-500/10" :
                isWrong ? "border-red-500 bg-red-500/10" : ""
              }
            >
              {c.name}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
