import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Flame, Share2, LogOut, Trophy, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamStreaks, type TeamStreak } from "@/hooks/useTeamStreaks";
import { shareContent } from "@/lib/share";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";

export default function TeamStreaks() {
  const { user } = useAuth();
  const { teams, loading, create, join, leave } = useTeamStreaks();
  const [name, setName] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState(() => (searchParams.get("code") ?? "").toUpperCase());
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const autoJoinedRef = useRef(false);

  // Auto-apply ?code= from public team share links
  useEffect(() => {
    if (!user || autoJoinedRef.current) return;
    const c = (searchParams.get("code") ?? "").toUpperCase();
    if (!c) return;
    autoJoinedRef.current = true;
    (async () => {
      setBusy("join");
      try {
        await join(c);
        toast.success(`Joined team with code ${c}`);
        setCode("");
        const next = new URLSearchParams(searchParams);
        next.delete("code");
        setSearchParams(next, { replace: true });
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(null);
      }
    })();
  }, [user, searchParams, setSearchParams, join]);


  const onCreate = async () => {
    if (!name.trim()) return;
    setBusy("create");
    try {
      await create(name.trim());
      setName("");
      toast.success("Team created");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onJoin = async () => {
    if (!code.trim()) return;
    setBusy("join");
    try {
      await join(code.trim());
      setCode("");
      toast.success("Joined team");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Team streaks — Heartify" description="Build a shared streak with friends." path="/teams" />
        <Navbar />
        <main className="container mx-auto max-w-lg px-4 py-16 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-title font-bold text-foreground">Team streaks</h1>
          <p className="mt-2 text-muted-foreground">Sign in to build a shared streak with friends.</p>
          <Button asChild className="mt-4"><Link to="/login">Sign in</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Team streaks — Heartify" description="Build a shared streak with friends." path="/teams" />
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <header>
          <h1 className="text-title font-bold text-foreground">Team streaks</h1>
          <p className="text-sm text-muted-foreground">
            Small groups (2–10) share one streak. It advances only when everyone completes their daily dose.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create a team
            </h2>
            <Label htmlFor="team-name" className="text-micro">Team name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Family circle"
              maxLength={40}
            />
            <Button onClick={onCreate} disabled={busy === "create" || !name.trim()} className="w-full">
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create team"}
            </Button>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Join a team
            </h2>
            <Label htmlFor="team-code" className="text-micro">Invite code</Label>
            <Input
              id="team-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              maxLength={12}
            />
            <Button onClick={onJoin} disabled={busy === "join" || !code.trim()} variant="outline" className="w-full">
              {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join team"}
            </Button>
          </Card>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">Your teams</h2>
          {loading ? (
            <div className="space-y-3" aria-label="Loading your teams" role="status">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="h-10 w-10 rounded-card" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-card" />
                </Card>
              ))}
            </div>
          ) : teams.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              You aren't in any team yet. Create one and invite friends.
            </Card>
          ) : (
            <div className="space-y-3">
              {teams.map((t) => (
                <TeamRow key={t.id} team={t} onLeave={() => leave(t.id)} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function TeamRow({ team, onLeave }: { team: TeamStreak; onLeave: () => Promise<void> }) {
  const [leaving, setLeaving] = useState(false);
  const inviteUrl = `${window.location.origin}/t/${team.id}`;
  const allDoneToday = team.completed_today_count === team.member_count;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">{team.name}</h3>
            {team.is_creator && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                Owner
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> {team.current_streak} day streak
            </span>
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> best {team.longest_streak}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {team.member_count}/{team.member_limit}
            </span>
          </div>
          <div className={`mt-2 text-micro ${allDoneToday ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            Today: {team.completed_today_count}/{team.member_count} completed
            {allDoneToday ? " · streak advanced 🎉" : team.i_completed_today ? " · waiting on teammates" : " · your turn"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <code className="text-micro bg-muted px-2 py-1 rounded font-mono">{team.invite_code}</code>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            shareContent({
              kind: "referral_invite",
              refId: team.id,
              title: `Join my team streak on Heartify`,
              text: `Use code ${team.invite_code} to join "${team.name}" on Heartify.`,
              url: inviteUrl,
            })
          }
        >
          <Share2 className="h-3.5 w-3.5 mr-1" /> Share invite
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={leaving}
          onClick={async () => {
            if (!confirm(`Leave "${team.name}"?`)) return;
            setLeaving(true);
            try {
              await onLeave();
              toast.success("Left team");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setLeaving(false);
            }
          }}
          className="text-destructive hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
        </Button>
      </div>
    </Card>
  );
}
