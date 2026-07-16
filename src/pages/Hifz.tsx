import { localToday } from "@/lib/intl";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Check, RotateCcw, Trash2, Flame } from "lucide-react";
import { toast } from "sonner";

// Ayah counts per surah (1..114)
const AYAH_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const SURAH_NAMES = ["Al-Fatiha","Al-Baqarah","Al-Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadila","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah","Al-Fil","Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"];

type Entry = { memorized: number; lastReview: string | null; reviews: string[] };
type State = { entries: Record<number, Entry>; dailyLog: Record<string, number> };

const KEY = "heartify.hifz.v1";
const TOTAL_AYAT = AYAH_COUNTS.reduce((a, b) => a + b, 0);

const load = (): State => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { entries: {}, dailyLog: {} };
};

const todayKey = () => localToday();

const Hifz = () => {
  const [state, setState] = useState<State>(load);
  const [selected, setSelected] = useState<number>(114);
  const [input, setInput] = useState("");

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const totalMemorized = useMemo(
    () => Object.values(state.entries).reduce((s, e) => s + (e.memorized || 0), 0),
    [state]
  );

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    while (true) {
      const k = d.toISOString().slice(0, 10);
      if ((state.dailyLog[k] || 0) > 0) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return s;
  }, [state]);

  const dueReview = useMemo(() => {
    const now = Date.now();
    return Object.entries(state.entries)
      .filter(([, e]) => e.memorized > 0 && (!e.lastReview || now - new Date(e.lastReview).getTime() > 7 * 86400_000))
      .map(([k]) => Number(k))
      .sort((a, b) => a - b);
  }, [state]);

  const surahMax = AYAH_COUNTS[selected - 1];
  const current = state.entries[selected]?.memorized || 0;

  const saveMemorized = (n: number) => {
    if (isNaN(n) || n < 0) return toast.error("Enter a valid number");
    if (n > surahMax) return toast.error(`Max ${surahMax} ayat`);
    setState((s) => {
      const prev = s.entries[selected]?.memorized || 0;
      const delta = Math.max(0, n - prev);
      const t = todayKey();
      return {
        entries: {
          ...s.entries,
          [selected]: {
            memorized: n,
            lastReview: s.entries[selected]?.lastReview || null,
            reviews: s.entries[selected]?.reviews || [],
          },
        },
        dailyLog: { ...s.dailyLog, [t]: (s.dailyLog[t] || 0) + delta },
      };
    });
    setInput("");
    toast.success(`${SURAH_NAMES[selected - 1]}: ${n}/${surahMax} ayat`);
  };

  const markReviewed = (surah: number) => {
    setState((s) => ({
      ...s,
      entries: {
        ...s.entries,
        [surah]: {
          ...(s.entries[surah] || { memorized: 0, reviews: [] }),
          lastReview: new Date().toISOString(),
          reviews: [...(s.entries[surah]?.reviews || []), new Date().toISOString()].slice(-20),
        },
      },
    }));
    toast.success(`Reviewed ${SURAH_NAMES[surah - 1]}`);
  };

  const reset = () => {
    if (!confirm("Reset all Hifz progress? This cannot be undone.")) return;
    setState({ entries: {}, dailyLog: {} });
    toast.success("Hifz reset");
  };

  const percent = (totalMemorized / TOTAL_AYAT) * 100;
  const memorizedSurahs = Object.entries(state.entries)
    .filter(([, e]) => e.memorized > 0)
    .map(([k, e]) => ({ surah: Number(k), ...e }))
    .sort((a, b) => a.surah - b.surah);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Hifz tracker — Heartify"
        description="Track your Quran memorization ayah by ayah, review with spaced reminders, and build a daily hifz streak."
        path="/hifz"
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-title font-bold tracking-tight">Hifz tracker</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Log memorized ayat surah-by-surah, review on a 7-day cycle, and keep a hifz streak.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="p-4">
            <p className="text-micro text-muted-foreground">Total memorized</p>
            <p className="mt-1 text-title font-bold">{totalMemorized.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {TOTAL_AYAT.toLocaleString()}</span></p>
            <Progress value={percent} className="mt-2 h-2" />
            <p className="mt-1 text-micro text-muted-foreground">{percent.toFixed(2)}% of the Qur'an</p>
          </Card>
          <Card className="p-4">
            <p className="text-micro text-muted-foreground">Surahs started</p>
            <p className="mt-1 text-title font-bold">{memorizedSurahs.length} <span className="text-sm font-normal text-muted-foreground">/ 114</span></p>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <Flame className="h-8 w-8 text-primary" />
            <div>
              <p className="text-micro text-muted-foreground">Daily hifz streak</p>
              <p className="text-title font-bold">{streak} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            </div>
          </Card>
        </div>

        <Card className="p-4 mb-6">
          <h2 className="text-heading font-semibold mb-3">Log memorization</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div>
              <Label htmlFor="surah" className="text-micro">Surah</Label>
              <select
                id="surah"
                value={selected}
                onChange={(e) => setSelected(Number(e.target.value))}
                className="mt-1 w-full rounded-card border border-input bg-background px-3 py-2 text-sm"
              >
                {SURAH_NAMES.map((n, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}. {n} ({AYAH_COUNTS[i]} ayat)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ayat" className="text-micro">Ayat memorized</Label>
              <Input
                id="ayat"
                type="number"
                min={0}
                max={surahMax}
                placeholder={String(current)}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="mt-1 w-32"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => saveMemorized(Number(input || current))}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
          <p className="mt-2 text-micro text-muted-foreground">
            Current: {current}/{surahMax} ayat of {SURAH_NAMES[selected - 1]}
          </p>
        </Card>

        {dueReview.length > 0 && (
          <Card className="p-4 mb-6 border-primary/30 bg-primary/5">
            <h2 className="text-heading font-semibold mb-2">Due for review</h2>
            <p className="text-sm text-muted-foreground mb-3">
              These surahs haven't been reviewed in 7+ days — revise to keep them strong.
            </p>
            <div className="flex flex-wrap gap-2">
              {dueReview.map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => markReviewed(s)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  {SURAH_NAMES[s - 1]}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading font-semibold">Your hifz</h2>
            {memorizedSurahs.length > 0 && (
              <Button size="sm" variant="ghost" onClick={reset}>
                <Trash2 className="h-4 w-4 mr-1" /> Reset
              </Button>
            )}
          </div>
          {memorizedSurahs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No surahs logged yet. Start with any surah above.</p>
          ) : (
            <div className="divide-y divide-border">
              {memorizedSurahs.map(({ surah, memorized, lastReview }) => {
                const max = AYAH_COUNTS[surah - 1];
                const pct = (memorized / max) * 100;
                const complete = memorized >= max;
                return (
                  <div key={surah} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {surah}. {SURAH_NAMES[surah - 1]}
                        </span>
                        {complete && <Badge variant="secondary" className="text-micro">Complete</Badge>}
                      </div>
                      <Progress value={pct} className="mt-1 h-1.5" />
                      <p className="mt-1 text-micro text-muted-foreground">
                        {memorized}/{max} ayat
                        {lastReview && ` · reviewed ${new Date(lastReview).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => markReviewed(surah)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Hifz;
