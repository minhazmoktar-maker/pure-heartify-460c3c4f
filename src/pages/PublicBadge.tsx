import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Share2 } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { getBadge } from "@/data/badges";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const TIER_STYLES: Record<string, string> = {
  bronze: "border-amber-600/40 bg-amber-950/10 text-amber-500",
  silver: "border-slate-400/40 bg-slate-500/10 text-slate-400",
  gold:   "border-yellow-400/50 bg-yellow-500/10 text-yellow-500",
};

interface ProfileLite {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function PublicBadge() {
  const { handle = "", badgeId = "" } = useParams();
  const badge = getBadge(badgeId);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_public_profile", { _handle: handle });
      if (!mounted) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setProfile({ handle: row.handle, display_name: row.display_name, avatar_url: row.avatar_url });
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [handle]);

  const displayName = profile?.display_name || profile?.handle || `@${handle}`;

  const onShare = async () => {
    if (!badge) return;
    await shareContent({
      kind: "badge_earned",
      refId: badge.id,
      title: `${displayName} unlocked ${badge.title} on Heartify`,
      text: `${badge.emoji} ${badge.title} — ${badge.description}`,
      url: `${window.location.origin}/b/${handle}/${badge.id}`,
    });
    await track("badge.shared", { badge_id: badge.id, handle });
  };

  if (!badge) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Badge not found — Heartify" description="This achievement badge doesn't exist." path={`/b/${handle}/${badgeId}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
          <EmptyState
            icon={Trophy}
            title="Badge not found"
            description="This achievement badge doesn't exist or is no longer public. Explore the full catalogue and earn your own."
            actionLabel="See all badges"
            actionHref="/achievements"
          />
        </main>
      </div>
    );
  }

  const title = `${displayName} unlocked ${badge.title}`;
  const description = `${badge.emoji} ${badge.title} — ${badge.description}. Earn yours on Heartify.`;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title={`${title} — Heartify`} description={description} path={`/b/${handle}/${badge.id}`} />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        {loading ? (
          <PageSkeleton variant="detail" />
        ) : (
          <>
            <Card className={`overflow-hidden ${TIER_STYLES[badge.tier]}`}>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-pill bg-background/60 text-display">
                  {badge.emoji}
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[10px] uppercase">{badge.tier}</Badge>
                  <h1 className="text-title font-bold">{badge.title}</h1>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 text-sm">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span>
                    Unlocked by{" "}
                    {profile ? (
                      <Link to={`/u/${profile.handle}`} className="font-semibold text-foreground hover:underline">
                        {displayName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{displayName}</span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/signup">Earn your own badge</Link>
              </Button>
              <Button variant="outline" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button asChild variant="ghost">
                <Link to="/achievements">See all badges</Link>
              </Button>
            </div>

            <p className="mt-6 text-center text-micro text-muted-foreground">
              Heartify — halal streaming with streaks, dhikr, and Qur'an milestones.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
