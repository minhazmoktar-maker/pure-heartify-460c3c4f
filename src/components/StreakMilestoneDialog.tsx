import { useEffect, useState } from "react";
import { Flame, Share2, Snowflake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { celebrateMilestone } from "@/lib/celebrate";
import { track } from "@/lib/analytics";
import { haptic } from "@/lib/haptics";

/**
 * Global listener for `heartify:streak-milestone` custom events dispatched
 * from useStreak.recordActivity when the DB reports a new milestone.
 * Fires confetti + shows a shareable card.
 */
type Detail = { milestone: number; freezeGranted?: boolean };

const COPY: Record<number, { headline: string; verse: string }> = {
  3:   { headline: "3 days consistent", verse: "The most beloved deeds to Allah are those done regularly, even if small. — Bukhari" },
  7:   { headline: "One week strong",   verse: "Verily, with hardship comes ease. — Qur'an 94:6" },
  14:  { headline: "Two weeks in",       verse: "Whoever treads a path in search of knowledge, Allah eases his way to Paradise. — Muslim" },
  30:  { headline: "A full month",       verse: "Indeed, Allah loves those who are steadfast. — Qur'an 3:146" },
  60:  { headline: "Sixty days of light",verse: "The believer is not exhausted by good. — Tirmidhi" },
  100: { headline: "Century of dhikr",   verse: "Remember Me and I will remember you. — Qur'an 2:152" },
  180: { headline: "Half a year",        verse: "Allah does not burden a soul beyond what it can bear. — Qur'an 2:286" },
  365: { headline: "One full year",      verse: "Say: My prayer, my rites, my life and my death are for Allah. — Qur'an 6:162" },
  500: { headline: "500 days",           verse: "And whoever puts their trust in Allah, He is sufficient for them. — Qur'an 65:3" },
  1000:{ headline: "1000 days",          verse: "The reward of a deed depends upon the intention. — Bukhari" },
};

export function StreakMilestoneDialog() {
  const [milestone, setMilestone] = useState<number | null>(null);
  const [freezeGranted, setFreezeGranted] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Detail>).detail;
      if (!detail?.milestone) return;
      setMilestone(detail.milestone);
      setFreezeGranted(!!detail.freezeGranted);
      celebrateMilestone(detail.milestone);
      void track("streak_milestone_shown", { milestone: detail.milestone });
    };
    window.addEventListener("heartify:streak-milestone", handler);
    return () => window.removeEventListener("heartify:streak-milestone", handler);
  }, []);

  if (!milestone) return null;
  const copy = COPY[milestone] ?? { headline: `${milestone} days`, verse: "" };

  const share = async () => {
    const text = `Alhamdulillah — ${milestone}-day Heartify streak. ${copy.verse}`;
    const url = `${window.location.origin}/?ref=streak-${milestone}`;
    void track("streak_milestone_shared", { milestone });
    haptic("success");
    try {
      if (navigator.share) {
        await navigator.share({ title: `${milestone}-day streak`, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch { /* user cancelled */ }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) setMilestone(null); }}>
      <DialogContent className="max-w-sm text-center">
        <button
          onClick={() => setMilestone(null)}
          aria-label="Close celebration"
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20">
          <Flame className="h-8 w-8 text-orange-500" aria-hidden />
        </div>

        <DialogTitle className="mt-4 text-3xl font-bold">
          {milestone} <span className="text-lg font-medium text-muted-foreground">days</span>
        </DialogTitle>
        <DialogDescription className="text-base font-medium text-foreground">
          {copy.headline}
        </DialogDescription>

        {copy.verse && (
          <p className="mx-auto mt-3 max-w-xs text-sm italic leading-relaxed text-muted-foreground">
            "{copy.verse}"
          </p>
        )}

        {freezeGranted && (
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-500">
            <Snowflake className="h-3.5 w-3.5" aria-hidden />
            Free streak-freeze granted
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <Button onClick={share} className="flex-1 gap-2">
            <Share2 className="h-4 w-4" aria-hidden />
            Share
          </Button>
          <Button variant="outline" onClick={() => setMilestone(null)} className="flex-1">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StreakMilestoneDialog;
