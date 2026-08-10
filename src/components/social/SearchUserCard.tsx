import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Flame, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import MemberAvatar from "@/components/social/MemberAvatar";
import type { UserSearchResult } from "@/hooks/useSocial";

/** Search result row in "Find friends". */
export default function SearchUserCard({
  row,
  onConnect,
  pending,
}: {
  row: UserSearchResult;
  onConnect: () => void;
  pending: boolean;
}) {
  const name = row.display_name || `@${row.handle}`;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <MemberAvatar url={row.avatar_url} name={name} size="sm" />
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
      </CardContent>
    </Card>
  );
}
