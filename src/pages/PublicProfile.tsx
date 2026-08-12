import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Users, Share2, UserX, Lock, Sparkles } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";
import NudgeButton from "@/components/NudgeButton";
import ReportUserDialog from "@/components/social/ReportUserDialog";
import { useSocial } from "@/hooks/useSocial";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, ShieldOff, Flag } from "lucide-react";

interface Badge {
  key: string;
  name: string | null;
  icon: string | null;
  description: string | null;
  earned_at: string;
}

interface Milestone {
  milestone: number;
  reached_at: string;
}

interface Showcase {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  joined_at: string;
  is_me: boolean;
  connected: boolean;
  streak_shared: boolean;
  progress_shared: boolean;
  activity_shared: boolean;
  current_streak: number | null;
  longest_streak: number | null;
  week: { minutes: number; videos: number; doses: number; days: number } | null;
  referrals_redeemed: number;
  badge_count: number;
  badges: Badge[];
  milestones: Milestone[];
  challenges_completed: number | null;
  error?: string;
}

/**
 * Public / connections-only profile.
 *
 * Everything shown here is server-rendered by `get_profile_showcase`, which
 * applies the member's own privacy controls (profile / streak / progress /
 * activity visibility) before any value leaves the database. The client never
 * decides what is shareable.
 */
export default function PublicProfile() {
  const { handle = "" } = useParams();
  const [profile, setProfile] = useState<Showcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"ok" | "not_found" | "private" | "error">("ok");
  const [reportOpen, setReportOpen] = useState(false);
  const { blockUser } = useSocial();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_profile_showcase", { _handle: handle });
      if (!mounted) return;
      const row = (data ?? null) as unknown as Showcase | null;
      if (error) setState("error");
      else if (!row) setState("not_found");
      else if (row.error === "private") setState("private");
      else if (row.error) setState("not_found");
      else {
        setProfile(row);
        setState("ok");
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [handle]);

  const onShare = async () => {
    if (!profile) return;
    await shareContent({
      kind: "public_profile",
      title: `${profile.display_name ?? profile.handle} on Heartify`,
      text: profile.streak_shared
        ? `🔥 ${profile.current_streak}-day streak · 🏆 ${profile.badge_count} badges`
        : `🏆 ${profile.badge_count} badges on Heartify`,
      url: `${window.location.origin}/u/${profile.handle}`,
    });
    await track("public_profile.shared", { handle: profile.handle });
  };

  const displayName = profile?.display_name || profile?.handle || "Heartify user";
  const topMilestone = profile?.milestones?.[0];

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={profile ? `${displayName} — Heartify` : "Profile — Heartify"}
        description={
          profile
            ? `${displayName} on Heartify${profile.streak_shared ? ` — ${profile.current_streak}-day streak` : ""} with ${profile.badge_count} badges.`
            : "Heartify public profile"
        }
        path={`/u/${handle}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        {loading ? (
          <PageSkeleton variant="detail" />
        ) : state === "private" ? (
          <EmptyState
            icon={Lock}
            title="This profile is private"
            description={`@${handle} shares their profile only with their connections. Send a connection request to see their progress.`}
            actionLabel="Find friends"
            actionHref="/connections?tab=find"
          />
        ) : state === "error" ? (
          <EmptyState
            icon={UserX}
            title="Couldn't load this profile"
            description="Something went wrong. Please check your connection and try again."
            actionLabel="Reload"
            onAction={() => window.location.reload()}
          />
        ) : state === "not_found" || !profile ? (
          <EmptyState
            icon={UserX}
            title="Profile not found"
            description={`No Heartify member with handle @${handle}. They may have changed their handle or made their profile private.`}
            actionLabel="Go home"
            actionHref="/"
          />
        ) : (
          <>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-pill bg-primary text-title font-bold text-primary-foreground overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      displayName[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-title font-bold truncate">{displayName}</h1>
                    <p className="text-sm text-muted-foreground font-mono">@{profile.handle}</p>
                    <p className="text-micro text-muted-foreground mt-0.5">
                      Joined {new Date(profile.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {!profile.is_me && <NudgeButton handle={profile.handle} displayName={profile.display_name} />}
                    <Button size="sm" variant="outline" onClick={onShare} aria-label="Share profile">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {!profile.is_me && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={`Safety options for ${displayName}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => blockUser.mutate(profile.handle)}>
                            <ShieldOff className="mr-2 h-4 w-4" /> Block member
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setReportOpen(true)}>
                            <Flag className="mr-2 h-4 w-4" /> Report member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
                    {profile.bio}
                  </p>
                )}

                {topMilestone && (
                  <div className="rounded-card border border-primary/30 bg-primary/5 p-3 text-center">
                    <p className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                      {topMilestone.milestone}-day milestone reached
                    </p>
                    <p className="text-micro text-muted-foreground">
                      {new Date(topMilestone.reached_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {profile.streak_shared ? (
                    <>
                      <Stat icon={<Flame className="h-4 w-4 text-orange-500" />} label="Current streak" value={profile.current_streak ?? 0} />
                      <Stat icon={<Trophy className="h-4 w-4 text-yellow-500" />} label="Longest" value={profile.longest_streak ?? 0} />
                    </>
                  ) : (
                    <div className="col-span-2 rounded-card border bg-muted/30 p-3 text-center text-micro text-muted-foreground">
                      Streak kept private
                    </div>
                  )}
                  <Stat icon={<Users className="h-4 w-4 text-primary" />} label="Referred" value={profile.referrals_redeemed} />
                </div>

                {profile.progress_shared && profile.week && (
                  <div className="grid grid-cols-4 gap-2 rounded-card border bg-muted/30 p-3 text-center">
                    <MiniStat label="min / wk" value={profile.week.minutes} />
                    <MiniStat label="doses" value={profile.week.doses} />
                    <MiniStat label="videos" value={profile.week.videos} />
                    <MiniStat label="days" value={profile.week.days} />
                  </div>
                )}

                <div className="rounded-card border bg-muted/30 p-3 text-center">
                  <p className="text-micro text-muted-foreground">🏆 Badges earned</p>
                  <p className="text-title font-bold text-foreground">{profile.badge_count}</p>
                </div>

                {profile.activity_shared && profile.badges.length > 0 && (
                  <section>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Achievements
                    </h2>
                    <ul className="grid grid-cols-2 gap-2">
                      {profile.badges.slice(0, 12).map((b) => (
                        <li key={b.key} className="flex items-center gap-2 rounded-card border bg-card p-2">
                          <span aria-hidden className="text-lg">{b.icon ?? "🏅"}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{b.name ?? b.key}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {new Date(b.earned_at).toLocaleDateString()}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {profile.activity_shared && (profile.challenges_completed ?? 0) > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    🌿 {profile.challenges_completed} accountability challenge
                    {profile.challenges_completed === 1 ? "" : "s"} completed
                  </p>
                )}

                {!profile.activity_shared && (
                  <p className="text-center text-micro text-muted-foreground">
                    Achievements are shared only with their connections.
                  </p>
                )}
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-micro text-muted-foreground">
              Want your own? <Link to="/signup" className="text-primary underline">Join Heartify</Link>
            </p>
          </>
        )}
      </main>
      <ReportUserDialog
        handle={profile ? profile.handle : handle}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-card border bg-card p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-heading font-bold">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-sm font-bold">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
