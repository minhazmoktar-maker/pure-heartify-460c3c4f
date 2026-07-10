import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Loader2, Users } from "lucide-react";

interface PublicTeam {
  id: string;
  name: string;
  invite_code: string;
  current_streak: number;
  longest_streak: number;
  member_count: number;
  member_limit: number;
}

export default function PublicTeamStreak() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<PublicTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.rpc("get_public_team_streak", { _id: id });
      if (cancelled) return;
      if (error || !data) setNotFound(true);
      else setTeam(data as unknown as PublicTeam);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !team) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-center p-6">
        <SEO title="Team not found — Heartify" description="This team streak link is not available." path={`/t/${id}`} />
        <div>
          <h1 className="text-xl font-bold text-foreground">Team not found</h1>
          <p className="text-muted-foreground mt-2">This link may have expired.</p>
          <Button asChild className="mt-4"><Link to="/">Go home</Link></Button>
        </div>
      </div>
    );
  }

  const full = team.member_count >= team.member_limit;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Join "${team.name}" — Team streak on Heartify`}
        description={`${team.member_count}/${team.member_limit} members · ${team.current_streak}-day streak. Join and keep it alive.`}
        path={`/t/${team.id}`}
      />
      <main className="container mx-auto max-w-lg px-4 py-12 space-y-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Team streak</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{team.name}</h1>
        </header>

        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Flame className="h-5 w-5 mx-auto text-primary" />
              <div className="mt-1 text-2xl font-bold text-foreground">{team.current_streak}</div>
              <div className="text-xs text-muted-foreground">Day streak</div>
            </div>
            <div>
              <Users className="h-5 w-5 mx-auto text-primary" />
              <div className="mt-1 text-2xl font-bold text-foreground">
                {team.member_count}/{team.member_limit}
              </div>
              <div className="text-xs text-muted-foreground">Members</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{team.longest_streak}</div>
              <div className="text-xs text-muted-foreground">Longest</div>
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-center">
            <div className="text-xs text-muted-foreground">Invite code</div>
            <div className="font-mono text-lg font-semibold tracking-widest text-foreground">
              {team.invite_code}
            </div>
          </div>

          <Button asChild className="w-full" disabled={full}>
            <Link to={`/teams?code=${team.invite_code}`}>
              {full ? "Team is full" : "Join this team"}
            </Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You'll be asked to sign in first. Streak advances only when every member finishes their daily dose.
          </p>
        </Card>
      </main>
    </div>
  );
}
