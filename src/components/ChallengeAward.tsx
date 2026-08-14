import { Award, Trophy } from "lucide-react";
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
  /** Finishing place when the challenge was a competition (1 = winner). */
  rank?: number;
  /** Total finishers, shown as "1st of 4". */
  participants?: number;
}

export function medalTierForPoints(points: number): MedalTier {
  if (points >= 100) return "gold";
  if (points >= 50) return "silver";
  return "bronze";
}

/** Apple-Watch-style competition placement → medal metal. */
export function medalTierForRank(rank: number): MedalTier {
  if (rank <= 1) return "gold";
  if (rank === 2) return "silver";
  return "bronze";
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

const TIER_STYLE: Record<MedalTier, string> = {
  gold: "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  silver: "border-slate-400/50 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  bronze: "border-orange-700/40 bg-orange-700/10 text-orange-700 dark:text-orange-400",
};

const RING: Record<MedalTier, { from: string; to: string }> = {
  gold: { from: "hsl(45 90% 62%)", to: "hsl(35 85% 45%)" },
  silver: { from: "hsl(215 20% 82%)", to: "hsl(215 14% 55%)" },
  bronze: { from: "hsl(28 70% 60%)", to: "hsl(20 65% 38%)" },
};

/** Concentric activity-style rings with the placement in the centre. */
function AwardRing({ tier, rank }: { tier: MedalTier; rank?: number }) {
  const { from, to } = RING[tier];
  return (
    <div
      className="relative h-14 w-14 shrink-0 rounded-full p-[3px]"
      style={{ background: `conic-gradient(from 220deg, ${from}, ${to}, ${from})` }}
      aria-hidden
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full p-[2px]"
          style={{ background: `conic-gradient(from 40deg, ${to}, ${from}, ${to})` }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
            {rank ? (
              <span className="text-[11px] font-bold tabular-nums text-foreground">{ordinal(rank)}</span>
            ) : (
              <Trophy className="h-3.5 w-3.5 text-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Award row shown on a completed or won challenge: an Apple-Watch-style medal
 * ring plus one-tap medal and certificate image shares.
 */
export default function ChallengeAward({ title, tier, note, rank, participants }: Props) {
  const { handle, displayName } = useMyHandle();
  const recipient = displayName || (handle ? `@${handle}` : "A Heartify believer");
  const won = rank === 1;
  const text = won
    ? `Alhamdulillah — finished 1st in the "${title}" challenge on Heartify.`
    : `Alhamdulillah — completed the "${title}" challenge on Heartify.`;
  const chip = rank
    ? `${ordinal(rank)} place${participants ? ` of ${participants}` : ""} · ${tier} medal`
    : `${tier} medal earned`;

  return (
    <div className="mt-3 space-y-3 rounded-card border border-dashed border-border/70 p-3">
      <div className="flex items-center gap-3">
        <AwardRing tier={tier} rank={rank} />
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${TIER_STYLE[tier]}`}
          >
            <Award className="h-3.5 w-3.5" aria-hidden />
            {chip}
          </span>
          {note && <p className="mt-1 truncate text-micro text-muted-foreground">{note}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ShareImageButton
          label={won ? "Share winner medal" : "Share medal"}
          variant="solid"
          className="text-xs"
          input={{
            variant: "medal",
            achievement: title,
            achievementNote: note,
            tier,
            recipient,
            rank,
            participants,
          }}
          meta={{ title: `${title} — medal`, text }}
        />
        <ShareImageButton
          label="Certificate"
          className="text-xs"
          input={{
            variant: "certificate",
            achievement: title,
            achievementNote: rank
              ? `${ordinal(rank)} place${participants ? ` of ${participants}` : ""}${note ? ` · ${note}` : ""}`
              : note,
            recipient,
          }}
          meta={{ title: `${title} — certificate`, text }}
        />
      </div>
    </div>
  );
}
