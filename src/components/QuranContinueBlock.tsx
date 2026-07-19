import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Play, ArrowRight, Sparkles } from "lucide-react";
import { AUDIO_EDITIONS } from "@/lib/quranApi";
import { Skeleton } from "@/components/ui/skeleton";

type Last = { surah: number; ayah: number; surahName?: string };

function dailySeed() {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/**
 * Header block for the Quran index — resume card, last reciter, and verse
 * of the day. Every element is a single glanceable next action so returning
 * users always know where to pick up.
 */
const QuranContinueBlock = () => {
  const [last, setLast] = useState<Last | null>(null);
  const [reciterId, setReciterId] = useState<string>("ar.alafasy");
  const [verse, setVerse] = useState<{ arabic: string; english: string; ref: string; surah: number; ayah: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("quran:last-ayah");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.surah && p?.ayah) setLast({ surah: p.surah, ayah: p.ayah, surahName: p.surahName });
      }
      const prefsRaw = localStorage.getItem("heartify.quran.prefs.v1");
      if (prefsRaw) {
        const p = JSON.parse(prefsRaw);
        if (p?.audioEdition) setReciterId(p.audioEdition);
      }
    } catch { /* ignore */ }

    let cancelled = false;
    const n = (dailySeed() % 6236) + 1;
    (async () => {
      try {
        const [ar, en] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/ayah/${n}/ar.alafasy`).then((r) => r.json()),
          fetch(`https://api.alquran.cloud/v1/ayah/${n}/en.sahih`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        const surah = ar?.data?.surah?.number ?? 1;
        const ayah = ar?.data?.numberInSurah ?? 1;
        setVerse({
          arabic: ar?.data?.text ?? "",
          english: en?.data?.text ?? "",
          ref: `${ar?.data?.surah?.englishName ?? "Al-Fatiha"} ${surah}:${ayah}`,
          surah,
          ayah,
        });
      } catch { /* offline */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const reciterLabel = AUDIO_EDITIONS.find((e) => e.id === reciterId)?.label ?? "Mishary Alafasy";

  return (
    <section className="mb-6 grid gap-3 md:grid-cols-2" aria-label="Continue reading">
      {/* Continue card */}
      {last ? (
        <Link
          to={`/quran/${last.surah}#ayah-${last.ayah}`}
          className="group flex flex-col justify-between rounded-card border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-5 transition-colors hover:border-primary/60"
        >
          <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Continue where you left off
          </div>
          <div className="mt-2">
            <p className="text-heading font-semibold text-foreground">
              {last.surahName ? `Surah ${last.surahName}` : `Surah ${last.surah}`}
              <span className="ml-2 text-sm font-normal text-muted-foreground">Ayah {last.ayah}</span>
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-micro text-muted-foreground">
              <Play className="h-3 w-3" />
              Last reciter: <span className="font-medium text-foreground">{reciterLabel}</span>
            </p>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            Resume reading <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      ) : (
        <Link
          to="/quran/1"
          className="group flex flex-col justify-between rounded-card border border-border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Start reading
          </div>
          <p className="mt-2 text-heading font-semibold text-foreground">Al-Fatiha — The Opening</p>
          <p className="mt-1 text-micro text-muted-foreground">Reciter: {reciterLabel}</p>
          <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            Open Surah 1 <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      )}

      {/* Verse of the day */}
      <Link
        to={verse ? `/quran/${verse.surah}#ayah-${verse.ayah}` : "/quran"}
        className="group flex flex-col justify-between rounded-card border border-border bg-card p-5 transition-colors hover:border-primary/40"
      >
        <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Verse of the day
        </div>
        {verse ? (
          <div className="mt-2 space-y-2">
            <p dir="rtl" lang="ar" className="line-clamp-2 text-right font-heading text-lg leading-relaxed text-foreground">
              {verse.arabic}
            </p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{verse.english}</p>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-micro">
          <span className="text-muted-foreground">{verse?.ref ?? "…"}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </section>
  );
};

export default QuranContinueBlock;
