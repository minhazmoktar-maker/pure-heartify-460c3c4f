import { Award } from "lucide-react";
import ShareImageButton from "@/components/ShareImageButton";
import { useMyHandle } from "@/hooks/useMyHandle";
import type { MedalTier } from "@/lib/shareImage";

interface Props {
  /** Challenge title shown on the medal and certificate. */
  title: string;
  /** Metal tier of the earned e-medal. */
  tier: MedalTier;
  /** Small line under the title, e.g. "Daily challenge — 50 points". */
  note?: string;
}

export function medalTierForPoints(points: number): MedalTier {
  if (points >= 100) return "gold";
  if (points >= 50) return "silver";
  return "bronze";
}

const TIER_STYLE: Record<MedalTier, string> = {
  gold: "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  silver: "border-slate-400/50 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  bronze: "border-orange-700/40 bg-orange-700/10 text-orange-700 dark:text-orange-400",
};

/**
 * Award row shown on a completed challenge: an e-medal chip plus one-tap
 * medal and certificate image shares.
 */
export default function ChallengeAward({ title, tier, note }: Props) {
  const { handle, displayName } = useMyHandle();
  const recipient = displayName || (handle ? `@${handle}` : "A Heartify believer");
  const text = `Alhamdulillah — completed the "${title}" challenge on Heartify.`;

  return (
    <div className="mt-3 space-y-2 rounded-card border border-dashed border-border/70 p-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${TIER_STYLE[tier]}`}
        >
          <Award className="h-3.5 w-3.5" aria-hidden />
          {tier} medal earned
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <ShareImageButton
          label="Share medal"
          variant="solid"
          className="text-xs"
          input={{ variant: "medal", achievement: title, achievementNote: note, tier, recipient }}
          meta={{ title: `${title} — medal`, text }}
        />
        <ShareImageButton
          label="Certificate"
          className="text-xs"
          input={{ variant: "certificate", achievement: title, achievementNote: note, recipient }}
          meta={{ title: `${title} — certificate`, text }}
        />
      </div>
    </div>
  );
}
