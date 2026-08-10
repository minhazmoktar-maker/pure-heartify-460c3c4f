import { Link } from "react-router-dom";
import { Flame, MoreVertical, Trash2, ShieldOff, Flag, Swords, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NudgeButton from "@/components/NudgeButton";
import Avatar from "@/components/social/MemberAvatar";
import type { ConnectionRow } from "@/hooks/useSocial";

/**
 * A single connection card — avatar, verified weekly progress (when shared),
 * and calm accountability actions. No like counts, no follower counts.
 */
export default function ConnectionCard({
  row,
  onRemove,
  onBlock,
  onReport,
  onChallenge,
}: {
  row: ConnectionRow;
  onRemove: () => void;
  onBlock: () => void;
  onReport: () => void;
  onChallenge: () => void;
}) {
  const name = row.display_name || `@${row.user_handle}`;
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start gap-3">
          <Avatar url={row.avatar_url} name={name} />
          <div className="min-w-0 flex-1">
            <Link to={`/u/${row.user_handle}`} className="block truncate font-semibold hover:underline">
              {name}
            </Link>
            <p className="truncate font-mono text-micro text-muted-foreground">@{row.user_handle}</p>
            {row.current_streak !== null && (
              <p className="mt-1 flex items-center gap-1 text-micro">
                <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden />
                <span className="font-medium">{row.current_streak} day streak</span>
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={`More options for ${name}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRemove}>
                <Trash2 className="mr-2 h-4 w-4" /> Remove connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBlock}>
                <ShieldOff className="mr-2 h-4 w-4" /> Block member
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReport}>
                <Flag className="mr-2 h-4 w-4" /> Report member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {row.progress_shared ? (
          <dl className="grid grid-cols-3 gap-2 rounded-card border bg-muted/30 p-2 text-center">
            <Metric label="min / week" value={row.week_minutes ?? 0} />
            <Metric label="doses" value={row.week_doses ?? 0} />
            <Metric label="videos" value={row.week_videos ?? 0} />
          </dl>
        ) : (
          <p className="rounded-card border bg-muted/20 p-2 text-center text-micro text-muted-foreground">
            Progress kept private
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="min-h-11 flex-1 gap-1.5">
            <Link to={`/u/${row.user_handle}`}>
              <BarChart3 className="h-4 w-4" /> Progress
            </Link>
          </Button>
          <NudgeButton handle={row.user_handle} displayName={row.display_name} />
          <Button size="sm" variant="outline" className="min-h-11 gap-1.5" onClick={onChallenge}>
            <Swords className="h-4 w-4" /> Challenge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}
