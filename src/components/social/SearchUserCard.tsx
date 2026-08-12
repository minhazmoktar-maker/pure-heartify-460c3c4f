import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Flame, MoreVertical, UserPlus, ShieldOff, Flag, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MemberAvatar from "@/components/social/MemberAvatar";
import type { UserSearchResult } from "@/hooks/useSocial";

/**
 * Search result row in "Find friends".
 *
 * Safety actions (report / block) are available for any member found in
 * search — not just existing connections — so an unwanted approach from a
 * stranger can be reported immediately.
 */
export default function SearchUserCard({
  row,
  onConnect,
  pending,
  onReport,
  onBlock,
}: {
  row: UserSearchResult;
  onConnect: () => void;
  pending: boolean;
  onReport?: () => void;
  onBlock?: () => void;
}) {
  const name = row.display_name || `@${row.handle}`;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <Link to={`/u/${row.handle}`} aria-label={`View ${name}'s profile`} className="shrink-0">
          <MemberAvatar url={row.avatar_url} name={name} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${row.handle}`} className="block truncate font-medium hover:underline">
            {name}
          </Link>
          <p className="truncate font-mono text-micro text-muted-foreground">@{row.handle}</p>
          {row.current_streak !== null && (
            <p className="mt-0.5 flex items-center gap-1 text-micro text-muted-foreground">
              <Flame className="h-3 w-3 text-orange-500" aria-hidden />
              {row.current_streak} day streak
            </p>
          )}
        </div>
        {row.connection_status === "connected" ? (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" aria-hidden /> Connected
          </Badge>
        ) : row.connection_status === "outgoing" ? (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" aria-hidden /> Requested
          </Badge>
        ) : row.connection_status === "incoming" ? (
          <Badge variant="outline">Awaiting you</Badge>
        ) : (
          <Button size="sm" className="min-h-11 gap-1.5" onClick={onConnect} disabled={pending}>
            <UserPlus className="h-4 w-4" aria-hidden /> Connect
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-11 w-11 shrink-0" aria-label={`More options for ${name}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/u/${row.handle}`}>
                <UserRound className="mr-2 h-4 w-4" /> View profile
              </Link>
            </DropdownMenuItem>
            {onBlock && (
              <DropdownMenuItem onClick={onBlock}>
                <ShieldOff className="mr-2 h-4 w-4" /> Block member
              </DropdownMenuItem>
            )}
            {onReport && (
              <DropdownMenuItem onClick={onReport}>
                <Flag className="mr-2 h-4 w-4" /> Report member
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
