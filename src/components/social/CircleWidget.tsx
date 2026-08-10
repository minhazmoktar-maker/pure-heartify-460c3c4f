import { Link } from "react-router-dom";
import { Flame, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useConnections, useMyProgress } from "@/hooks/useSocial";

/**
 * "Your Circle" — a calm accountability strip on Home.
 * Deliberately small: three streaks and one link. Never a social feed.
 */
export default function CircleWidget() {
  const { user } = useAuth();
  const { connections, loadingConnections } = useConnections();
  const { data: progress } = useMyProgress();

  if (!user || loadingConnections) return null;

  const withStreak = connections
    .filter((c) => c.current_streak !== null)
    .sort((a, b) => (b.current_streak ?? 0) - (a.current_streak ?? 0))
    .slice(0, 3);

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" aria-hidden /> Your Circle 🌿
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Learning is easier together. Find a friend to keep each other accountable.
          </p>
        ) : (
          <ul className="space-y-1.5">
            <li className="flex items-center justify-between text-sm">
              <span className="font-semibold">You</span>
              <span className="flex items-center gap-1 font-mono text-micro">
                <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden />
                {progress?.current_streak ?? 0} days
              </span>
            </li>
            {withStreak.map((c) => (
              <li key={c.user_handle} className="flex items-center justify-between text-sm">
                <Link to={`/u/${c.user_handle}`} className="truncate hover:underline">
                  {c.display_name || `@${c.user_handle}`}
                </Link>
                <span className="flex items-center gap-1 font-mono text-micro text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden />
                  {c.current_streak} days
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild size="sm" variant="outline" className="min-h-11 w-full">
          <Link to="/connections">{connections.length === 0 ? "Find friends" : "View connections"}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
