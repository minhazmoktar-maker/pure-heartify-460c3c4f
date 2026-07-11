import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Users, Share2, UserX } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";
import NudgeButton from "@/components/NudgeButton";


interface PublicProfileData {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_streak: number;
  longest_streak: number;
  badge_count: number;
  referrals_redeemed: number;
  joined_at: string;
}

export default function PublicProfile() {
  const { handle = "" } = useParams();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_profile", { _handle: handle });
      if (!mounted) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) setNotFound(true);
      else setProfile(row as PublicProfileData);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [handle]);

  const onShare = async () => {
    if (!profile) return;
    await shareContent({
      kind: "public_profile",
      title: `${profile.display_name ?? profile.handle} on Heartify`,
      text: `🔥 ${profile.current_streak}-day streak · 🏆 ${profile.badge_count} badges`,
      url: `${window.location.origin}/u/${profile.handle}`,
    });
    await track("public_profile.shared", { handle: profile.handle });
  };

  const displayName = profile?.display_name || profile?.handle || "Heartify user";

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={profile ? `${displayName} — Heartify` : "Profile — Heartify"}
        description={
          profile
            ? `${displayName} is on a ${profile.current_streak}-day streak on Heartify with ${profile.badge_count} badges.`
            : "Heartify public profile"
        }
        path={`/u/${handle}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notFound || !profile ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <h1 className="text-xl font-semibold">Profile not found</h1>
              <p className="text-sm text-muted-foreground">
                No user with handle <span className="font-mono">@{handle}</span>.
              </p>
              <Button asChild variant="outline">
                <Link to="/">Go home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      displayName[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold truncate">{displayName}</h1>
                    <p className="text-sm text-muted-foreground font-mono">@{profile.handle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Joined {new Date(profile.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <NudgeButton handle={profile.handle} displayName={profile.display_name} />
                    <Button size="sm" variant="outline" onClick={onShare} aria-label="Share profile">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>

                </div>

                {profile.bio && (
                  <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
                    {profile.bio}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <Stat icon={<Flame className="h-4 w-4 text-orange-500" />} label="Current streak" value={profile.current_streak} />
                  <Stat icon={<Trophy className="h-4 w-4 text-yellow-500" />} label="Longest" value={profile.longest_streak} />
                  <Stat icon={<Users className="h-4 w-4 text-primary" />} label="Referred" value={profile.referrals_redeemed} />
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground">🏆 Badges earned</p>
                  <p className="text-2xl font-bold text-foreground">{profile.badge_count}</p>
                </div>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Want your own? <Link to="/signup" className="text-primary underline">Join Heartify</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
