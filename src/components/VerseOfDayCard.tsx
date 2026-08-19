import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { heartAyahForDay, ayahDayIndex } from "@/data/heartAyat";

type Ayah = { arabic: string; english: string; ref: string; surah: number; ayah: number };

// Deterministic daily seed so the verse is stable within a day and advances
// to a genuinely new curated ayah every day (423-long rotation).
function dailySeed() {
  return ayahDayIndex();
}

const REVEAL_KEY = "verse:last-revealed-seed";

/**
 * Compact "resume-reading verse" surface for the signed-in Today shape.
 * Prefers the user's last-read ayah (persisted by the Quran reader in
 * localStorage under `quran:last-ayah`) and falls back to a rotating
 * daily ayah so the card always has content.
 *
 * T5 — Once-per-day reveal: the first time this card mounts on a given
 * UTC day, a signature Arabic-glyph fade/slide plays. Subsequent mounts
 * that day skip the animation entirely (respecting attention + reduced
 * motion). Gated by localStorage so it survives route changes but resets
 * daily with the seed.
 */
const VerseOfDayCard = () => {
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [resume, setResume] = useState<{ surah: number; ayah: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const seed = useMemo(() => dailySeed(), []);
  const [shouldReveal, setShouldReveal] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("quran:last-ayah");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.surah && parsed?.ayah) setResume({ surah: parsed.surah, ayah: parsed.ayah });
      }
    } catch { /* ignore */ }

    // Decide reveal state exactly once per day, per device.
    try {
      const last = Number(localStorage.getItem(REVEAL_KEY) ?? 0);
      if (last !== seed && !prefersReducedMotion) {
        setShouldReveal(true);
        localStorage.setItem(REVEAL_KEY, String(seed));
      }
    } catch { /* private mode — silently skip reveal */ }

    const pick = heartAyahForDay();
    setAyah({ arabic: pick.ar, english: pick.en, ref: pick.ref, surah: pick.s, ayah: pick.a });
  }, [seed, prefersReducedMotion]);


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
        <motion.div
          className="mt-2 space-y-2"
          initial={shouldReveal ? { opacity: 0, y: 8, filter: "blur(6px)" } : false}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: shouldReveal ? 0.05 : 0 }}
        >
          <motion.p
            dir="rtl"
            lang="ar"
            className="font-quran text-right text-[1.4rem] leading-[2.25] text-foreground"
            style={{
              fontFeatureSettings: '"liga", "calt", "kern", "rlig", "mset", "ss01"',
              unicodeBidi: "isolate",
              textWrap: "balance",
              wordSpacing: "0.05em",
            }}
            initial={shouldReveal ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: shouldReveal ? 0.15 : 0 }}
          >
            {ayah.arabic}
          </motion.p>

          <motion.p
            className="line-clamp-2 text-sm text-muted-foreground"
            initial={shouldReveal ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: shouldReveal ? 0.5 : 0 }}
          >
            {ayah.english}
          </motion.p>
        </motion.div>
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
