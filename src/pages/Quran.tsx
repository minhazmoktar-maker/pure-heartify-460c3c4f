import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Play, Pause, Loader2, ChevronRight, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AUDIO_EDITIONS,
  TRANSLATION_EDITIONS,
  getSurahArabic,
  getSurahAudio,
  getSurahTranslation,
  listSurahs,
  type Ayah,
} from "@/lib/quranApi";
import { cn } from "@/lib/utils";

const PREFS_KEY = "heartify.quran.prefs.v1";

interface Prefs {
  audioEdition: string;
  translationEdition: string;
  arabicSize: number;
}

const defaultPrefs: Prefs = {
  audioEdition: "ar.alafasy",
  translationEdition: "en.sahih",
  arabicSize: 28,
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs;
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultPrefs;
  }
}
function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

const SurahIndex = ({ onPick }: { onPick: (n: number) => void }) => {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["quran", "surahs"],
    queryFn: listSurahs,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter(
      (s) =>
        s.englishName.toLowerCase().includes(needle) ||
        s.englishNameTranslation.toLowerCase().includes(needle) ||
        String(s.number) === needle,
    );
  }, [data, q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search surah by name or number…"
          className="pl-9"
          aria-label="Search surah"
        />
      </div>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading surahs…
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">Could not load surah list. Check your connection.</p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <button
            key={s.number}
            onClick={() => onPick(s.number)}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {s.number}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {s.englishName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {s.englishNameTranslation} · {s.numberOfAyahs} ayat · {s.revelationType}
              </span>
            </span>
            <span className="font-arabic text-lg text-foreground" dir="rtl">
              {s.name}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
};

const SurahView = ({ n, prefs, setPrefs }: { n: number; prefs: Prefs; setPrefs: (p: Prefs) => void }) => {
  const arabic = useQuery({ queryKey: ["surah", n, "ar"], queryFn: () => getSurahArabic(n), staleTime: Infinity });
  const audio = useQuery({
    queryKey: ["surah", n, "audio", prefs.audioEdition],
    queryFn: () => getSurahAudio(n, prefs.audioEdition),
    staleTime: Infinity,
  });
  const translation = useQuery({
    queryKey: ["surah", n, "tr", prefs.translationEdition],
    queryFn: () => getSurahTranslation(n, prefs.translationEdition),
    staleTime: Infinity,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [n]);

  const playAyah = (ayah: Ayah) => {
    const url = ayah.audio || ayah.audioSecondary?.[0];
    if (!url) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingAyah === ayah.numberInSurah) {
      setPlayingAyah(null);
      return;
    }
    const el = new Audio(url);
    audioRef.current = el;
    el.play().then(() => setPlayingAyah(ayah.numberInSurah)).catch(() => setPlayingAyah(null));
    el.onended = () => {
      setPlayingAyah(null);
      // auto-advance
      const next = audio.data?.ayahs.find((a) => a.numberInSurah === ayah.numberInSurah + 1);
      if (next) playAyah(next);
    };
  };

  const isLoading = arabic.isLoading || audio.isLoading || translation.isLoading;
  const err = arabic.error || audio.error || translation.error;

  const ayat = useMemo(() => {
    if (!arabic.data) return [];
    return arabic.data.ayahs.map((a, i) => ({
      ar: a,
      audio: audio.data?.ayahs[i],
      tr: translation.data?.ayahs[i],
    }));
  }, [arabic.data, audio.data, translation.data]);

  return (
    <div className="space-y-4">
      {arabic.data && (
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {arabic.data.englishName}{" "}
              <span className="text-muted-foreground text-base font-normal">
                — {arabic.data.englishNameTranslation}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Surah {arabic.data.number} · {arabic.data.numberOfAyahs} verses · {arabic.data.revelationType}
            </p>
          </div>
          <p className="font-arabic text-3xl text-foreground" dir="rtl">
            {arabic.data.name}
          </p>
        </header>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Reciter</label>
          <Select
            value={prefs.audioEdition}
            onValueChange={(v) => setPrefs({ ...prefs, audioEdition: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUDIO_EDITIONS.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Translation</label>
          <Select
            value={prefs.translationEdition}
            onValueChange={(v) => setPrefs({ ...prefs, translationEdition: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRANSLATION_EDITIONS.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Arabic size: {prefs.arabicSize}px
          </label>
          <input
            type="range"
            min={20}
            max={44}
            step={1}
            value={prefs.arabicSize}
            onChange={(e) => setPrefs({ ...prefs, arabicSize: Number(e.target.value) })}
            className="w-full accent-primary"
            aria-label="Arabic text size"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading surah…
        </div>
      )}
      {err && (
        <p className="text-sm text-destructive">Could not load this surah. Try again shortly.</p>
      )}

      <ol className="space-y-3">
        {ayat.map(({ ar, audio: au, tr }) => {
          const isPlaying = playingAyah === ar.numberInSurah;
          return (
            <li key={ar.number}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {ar.numberInSurah}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p
                      className="font-arabic leading-loose text-foreground"
                      dir="rtl"
                      style={{ fontSize: `${prefs.arabicSize}px`, lineHeight: 2 }}
                    >
                      {ar.text}
                    </p>
                    {tr && (
                      <p className="text-sm text-muted-foreground">{tr.text}</p>
                    )}
                  </div>
                  {au && (au.audio || au.audioSecondary?.length) && (
                    <Button
                      variant={isPlaying ? "default" : "ghost"}
                      size="icon"
                      onClick={() => playAyah(au)}
                      aria-label={isPlaying ? `Pause ayah ${ar.numberInSurah}` : `Play ayah ${ar.numberInSurah}`}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const Quran = () => {
  const { surah } = useParams<{ surah?: string }>();
  const navigate = useNavigate();
  const [prefs, setPrefsState] = useState<Prefs>(() => loadPrefs());
  const setPrefs = (p: Prefs) => { setPrefsState(p); savePrefs(p); };

  const surahNum = surah ? Math.max(1, Math.min(114, Number(surah) || 0)) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={surahNum ? `Surah ${surahNum} · Quran · Heartify` : "Quran Reader · Heartify"}
        description="Read the Quran in Uthmani script with verse-by-verse audio and translations in English, Urdu, French, Indonesian, Turkish and Bengali."
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-foreground">Quran</h1>
            <p className="text-sm text-muted-foreground">
              {surahNum ? (
                <button
                  onClick={() => navigate("/quran")}
                  className="text-primary hover:underline"
                >
                  ← Back to all surahs
                </button>
              ) : (
                "Choose a surah to begin reading."
              )}
            </p>
          </div>
        </div>

        {surahNum ? (
          <SurahView n={surahNum} prefs={prefs} setPrefs={setPrefs} />
        ) : (
          <SurahIndex onPick={(n) => navigate(`/quran/${n}`)} />
        )}

        {!surahNum && (
          <p className="mt-8 text-xs text-muted-foreground">
            Text and audio from the free{" "}
            <Link to="https://alquran.cloud" className="underline" target="_blank" rel="noreferrer">
              al-quran.cloud
            </Link>{" "}
            API.
          </p>
        )}
      </main>
    </div>
  );
};

export default Quran;
