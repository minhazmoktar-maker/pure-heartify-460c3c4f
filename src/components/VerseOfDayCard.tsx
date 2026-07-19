import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Ayah = { arabic: string; english: string; ref: string; surah: number; ayah: number };

// Deterministic daily seed so the verse is stable within a day.
function dailySeed() {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/**
 * Compact "resume-reading verse" surface for the signed-in Today shape.
 * Prefers the user's last-read ayah (persisted by the Quran reader in
 * localStorage under `quran:last-ayah`) and falls back to a rotating
 * daily ayah so the card always has content.
 */
const VerseOfDayCard = () => {
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [resume, setResume] = useState<{ surah: number; ayah: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("quran:last-ayah");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.surah && parsed?.ayah) setResume({ surah: parsed.surah, ayah: parsed.ayah });
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
        const ayahNo = ar?.data?.numberInSurah ?? 1;
        setAyah({
          arabic: ar?.data?.text ?? "",
          english: en?.data?.text ?? "",
          ref: `${ar?.data?.surah?.englishName ?? "Al-Fatiha"} ${surah}:${ayahNo}`,
          surah,
          ayah: ayahNo,
        });
      } catch { /* offline */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const target = resume
    ? `/surah/${resume.surah}#ayah-${resume.ayah}`
    : ayah
      ? `/surah/${ayah.surah}#ayah-${ayah.ayah}`
      : "/quran";
  const label = resume ? "Continue reading" : "Read in Quran";

  return (
    <Link
      to={target}
      className="group flex h-full flex-col justify-between rounded-card border border-border bg-card p-4 transition-colors hover:border-primary/50"
      aria-label={label}
    >
      <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-primary">
        <BookOpen className="h-3.5 w-3.5" />
        {resume ? "Resume reading" : "Verse of the day"}
      </div>
      {ayah ? (
        <div className="mt-2 space-y-2">
          <p dir="rtl" lang="ar" className="line-clamp-2 text-right font-heading text-lg leading-relaxed text-foreground">
            {ayah.arabic}
          </p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{ayah.english}</p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-micro">
        <span className="text-muted-foreground">{ayah?.ref ?? "…"}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-primary transition-transform group-hover:translate-x-0.5">
          {label} <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
};

export default VerseOfDayCard;
