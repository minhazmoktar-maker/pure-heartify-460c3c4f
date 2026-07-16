import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ExternalLink, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OwnedChannel {
  id: string;
  title: string;
  handle: string | null;
  youtube_channel_id: string;
  status: string;
  consistency_score: number | null;
  last_rechecked_at: string | null;
}

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<OwnedChannel[]>([]);
  const [stats, setStats] = useState<Record<string, { followers: number; comments: number; watchers: number }>>({});

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: chans } = await supabase
        .from("approved_channels")
        .select("id,title,handle,youtube_channel_id,status,consistency_score,last_rechecked_at")
        .eq("owner_key", user.id);
      const list = (chans ?? []) as OwnedChannel[];
      setChannels(list);
      if (list.length > 0) {
        const ids = list.map((c) => c.id);
        const [{ data: follows }, { data: comments }] = await Promise.all([
          supabase.from("channel_follows").select("channel_id", { count: "exact" }).in("channel_id", ids),
          supabase.from("video_comments").select("id", { count: "exact", head: true }),
        ]);
        const followMap: Record<string, number> = {};
        (follows ?? []).forEach((f: any) => {
          followMap[f.channel_id] = (followMap[f.channel_id] ?? 0) + 1;
        });
        const s: typeof stats = {};
        list.forEach((c) => {
          s[c.id] = { followers: followMap[c.id] ?? 0, comments: 0, watchers: 0 };
        });
        setStats(s);
      }
      setLoading(false);
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <SEO path="/creators/dashboard" title="Creator dashboard — Heartify" description="Manage your approved channel on Heartify." />
        <p>Please <Link to="/login" className="text-primary underline">sign in</Link>.</p>
      </div>
    );
  }

  return (
    <>
      <SEO path="/creators/dashboard" title="Creator dashboard — Heartify" description="Follower counts, moderation, and recent activity for your approved channel." />
      <PageHeader
        title="Creator dashboard"
        subtitle="Follower counts, trust score, and moderation status for channels you own on Heartify."
      />
      <div className="container mx-auto max-w-5xl px-4 pb-16">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : channels.length === 0 ? (
          <div className="rounded-card border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              You don't have any approved channels linked to this account.
            </p>
            <Link to="/creators" className="mt-3 inline-block text-primary underline">Learn how to become a Heartify creator</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {channels.map((c) => (
              <li key={c.id} className="rounded-card border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-heading font-semibold text-foreground">{c.title}</h3>
                    <p className="text-micro text-muted-foreground">
                      {c.handle && <span className="mr-2">{c.handle}</span>}
                      <a
                        href={`https://youtube.com/channel/${c.youtube_channel_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        YouTube <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                  <span className="rounded-pill bg-primary/10 px-3 py-1 text-micro font-medium capitalize text-primary">
                    {c.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Stat label="Followers" value={stats[c.id]?.followers ?? 0} icon={<Users className="h-4 w-4" />} />
                  <Stat label="Trust score" value={c.consistency_score ?? "—"} />
                  <Stat
                    label="Last review"
                    value={c.last_rechecked_at ? new Date(c.last_rechecked_at).toLocaleDateString() : "—"}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-micro">
                  <Link to={`/appeals?kind=channel&ref=${c.id}`} className="rounded-pill border border-border px-3 py-1 hover:bg-accent">
                    File an appeal
                  </Link>
                  <Link to="/contact" className="rounded-pill border border-border px-3 py-1 hover:bg-accent">
                    Contact moderation team
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-background p-3">
      <p className="flex items-center gap-1 text-micro text-muted-foreground">{icon} {label}</p>
      <p className="mt-1 text-heading font-semibold text-foreground">{value}</p>
    </div>
  );
}
