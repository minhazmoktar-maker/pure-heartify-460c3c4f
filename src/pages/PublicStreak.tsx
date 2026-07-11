import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Share2 } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

interface ProfileLite {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  current_streak: number;
  longest_streak: number;
}

const MILESTONES = new Set([1, 3, 7, 14, 30, 50, 100, 200, 365, 500, 1000]);

function tierLabel(days: number) {
  if (days >= 365) return "Year of consistency";
  if (days >= 100) return "Century streak";
  if (days >= 30) return "Monthly warrior";
  if (days >= 7) return "One full week";
  return "Getting started";
}

export default function PublicStreak() {
  const { handle = "", days = "0" } = useParams();
  const nDays = Math.max(0, parseInt(days, 10) || 0);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_public_profile", { _handle: handle });
      if (!mounted) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setProfile(row as ProfileLite);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [handle]);

  const displayName = profile?.display_name || profile?.handle || `@${handle}`;
  const isMilestone = MILESTONES.has(nDays);
  const label = tierLabel(nDays);

  const onShare = async () => {
    await shareContent({
      kind: "streak_milestone",
      refId: String(nDays),
      title: `${displayName} — ${nDays}-day Heartify streak`,
      text: `🔥 ${nDays}-day streak on Heartify — ${label}.`,
      url: `${window.location.origin}/s/${handle}/${nDays}`,
    });
    await track("streak_milestone.shared", { days: nDays, handle });
  };

  const title = `${displayName} — ${nDays}-day streak`;
  const description = `🔥 ${nDays}-day consistency streak on Heartify (${label}). Build your own.`;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title={`${title} — Heartify`} description={description} path={`/s/${handle}/${nDays}`} />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card className="overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-background to-background">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
                  <Flame className="h-14 w-14" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
                  <h1 className="text-5xl font-black tabular-nums">{nDays}</h1>
                  <p className="text-lg font-semibold">day{nDays === 1 ? "" : "s"} of consistent worship</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  by{" "}
                  {profile ? (
                    <Link to={`/u/${profile.handle}`} className="font-semibold text-foreground hover:underline">
                      {displayName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground">{displayName}</span>
                  )}
                </p>
                {isMilestone && (
                  <p className="text-xs text-primary">🏆 Milestone unlocked</p>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/signup">Start your streak</Link>
              </Button>
              <Button variant="outline" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button asChild variant="ghost">
                <Link to="/achievements">See achievements</Link>
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Heartify — build a daily habit of salah, dhikr, and Qur'an.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
