import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, CheckCircle2, Swords } from "lucide-react";
import type { Challenge } from "@/hooks/useSocial";

const UNITS: Record<Challenge["type"], string> = {
  minutes: "beneficial minutes",
  doses: "Daily Doses",
  videos: "videos completed",
  sessions: "learning days",
  sadaqah_days: "days with sadaqah",
  sadaqah_acts: "sadaqah acts",
};

function daysLeft(endAt: string) {
  const ms = new Date(endAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function dayOf(startAt: string, endAt: string) {
  const total = Math.max(1, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 86_400_000));
  const elapsed = Math.min(total, Math.max(1, Math.ceil((Date.now() - new Date(startAt).getTime()) / 86_400_000)));
  return { elapsed, total };
}

/**
 * Challenge card — verified, server-computed progress for every member.
 * Language stays encouraging: nobody is told they "lost".
 */
export default function ChallengeCard({
  challenge,
  onRespond,
  onLeave,
}: {
  challenge: Challenge;
  onRespond?: (accept: boolean) => void;
  onLeave?: () => void;
}) {
  const { elapsed, total } = dayOf(challenge.start_at, challenge.end_at);
  const left = daysLeft(challenge.end_at);
  const ended = left === 0;
  const roster = [...challenge.members].sort((a, b) => b.progress - a.progress);
  const me = roster.find((m) => m.is_me);
  const leader = roster[0];
  const isInvite = challenge.my_state === "invited";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Swords className="h-4 w-4 text-primary" aria-hidden />
              <span className="truncate">{challenge.title}</span>
            </CardTitle>
            <p className="mt-1 text-micro text-muted-foreground">
              Goal: {challenge.goal.toLocaleString()} {UNITS[challenge.type]}
            </p>
          </div>
          <Badge variant={ended ? "secondary" : "outline"} className="shrink-0 gap-1 text-[10px]">
            <CalendarClock className="h-3 w-3" aria-hidden />
            {ended ? "Finished" : `Day ${elapsed} of ${total}`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {challenge.type.startsWith("sadaqah") && (
          <p className="rounded-card border bg-muted/20 p-2 text-micro text-muted-foreground">
            Counts only — nobody can see how much anyone gave.
          </p>
        )}
        {isInvite ? (
          <p className="text-sm text-muted-foreground">
            You've been invited to this accountability challenge.
          </p>
        ) : (
          <ul className="space-y-2">
            {roster.map((m) => {
              const pct = Math.min(100, Math.round((m.progress / challenge.goal) * 100));
              return (
                <li key={m.handle} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className={m.is_me ? "font-semibold" : ""}>
                      <Link to={m.is_me ? "/profile" : `/u/${m.handle}`} className="hover:underline">
                        {m.is_me ? "You" : m.display_name || `@${m.handle}`}
                      </Link>
                      {m.state === "invited" && (
                        <span className="ml-1 text-micro text-muted-foreground">(invited)</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-micro">
                      {m.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />}
                      {m.progress.toLocaleString()} / {challenge.goal.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" aria-label={`${m.is_me ? "Your" : m.handle} progress`} />
                </li>
              );
            })}
          </ul>
        )}

        {!isInvite && me && leader && (
          <p className="text-micro text-muted-foreground">
            {me.completed
              ? "You reached your goal — alhamdulillah 🌿"
              : leader.is_me
                ? ended
                  ? "You finished ahead — keep the habit going."
                  : "You're leading your circle — keep going!"
                : ended
                  ? `${leader.display_name || "@" + leader.handle} finished ahead by ${(leader.progress - me.progress).toLocaleString()}. Every minute still counted.`
                  : `${leader.display_name || "@" + leader.handle} is ahead by ${(leader.progress - me.progress).toLocaleString()}. A little more and you can catch up.`}
            {!ended && ` · ${left} day${left === 1 ? "" : "s"} remaining`}
          </p>
        )}

        {isInvite && onRespond && (
          <div className="flex gap-2">
            <Button size="sm" className="min-h-11 flex-1" onClick={() => onRespond(true)}>
              Accept
            </Button>
            <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => onRespond(false)}>
              Decline
            </Button>
          </div>
        )}
        {!isInvite && !ended && onLeave && (
          <Button size="sm" variant="ghost" className="min-h-11 text-muted-foreground" onClick={onLeave}>
            {challenge.is_creator ? "Cancel challenge" : "Leave challenge"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
