import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Youtube, Radio, Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SuggestContentDialog } from "@/components/SuggestContentDialog";
import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected" | string;

const STATUS_STYLES: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  pending:  { icon: Clock,        label: "In review",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  approved: { icon: CheckCircle2, label: "Approved",   className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rejected: { icon: XCircle,      label: "Not a fit",  className: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
};

function StatusPill({ status }: { status: Status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", s.className)}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

const Creators = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login?redirect=/creators");
  }, [user, loading, navigate]);

  const videosQ = useQuery({
    enabled: !!user,
    queryKey: ["creator-video-candidates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_candidates")
        .select("id, title, channel_title, thumbnail_url, status, created_at, youtube_video_id")
        .eq("submitted_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const channelsQ = useQuery({
    enabled: !!user,
    queryKey: ["creator-channel-candidates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_candidates")
        .select("id, channel_title, channel_handle, status, created_at, youtube_channel_id")
        .eq("submitted_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = {
    total: (videosQ.data?.length ?? 0) + (channelsQ.data?.length ?? 0),
    approved:
      (videosQ.data?.filter((v) => v.status === "approved").length ?? 0) +
      (channelsQ.data?.filter((c) => c.status === "approved").length ?? 0),
    pending:
      (videosQ.data?.filter((v) => v.status === "pending").length ?? 0) +
      (channelsQ.data?.filter((c) => c.status === "pending").length ?? 0),
  };

  const isLoading = videosQ.isLoading || channelsQ.isLoading;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/5 via-background to-background">
      <SEO
        title="Creator Studio — Heartify"
        description="Track the halal videos and channels you've suggested to Heartify and see moderation status."
        path="/creators"
      />
      <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-4 w-4" /> Creator Studio
            </div>
            <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Your suggestions</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              Every video and channel here flows through the same moderation pipeline as our own ingestion. Nothing goes live until it passes review — jazākum Allāhu khayran for keeping the platform halal.
            </p>
          </div>
          <SuggestContentDialog>
            <Button size="lg" className="rounded-full">Suggest content</Button>
          </SuggestContentDialog>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Submitted", value: counts.total },
            { label: "Approved", value: counts.approved },
            { label: "In review", value: counts.pending },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-2xl font-semibold text-foreground">{s.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <Youtube className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Videos</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : (videosQ.data?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
              You haven't suggested any videos yet.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {videosQ.data!.map((v) => (
                <li key={v.id} className="flex items-center gap-3 p-3">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="h-12 w-20 rounded-md object-cover" loading="lazy" />
                  ) : (
                    <div className="h-12 w-20 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{v.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {v.channel_title ?? "Unknown channel"} · {new Date(v.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusPill status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Channels</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (channelsQ.data?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
              You haven't suggested any channels yet.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {channelsQ.data!.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {c.channel_title ?? c.channel_handle ?? c.youtube_channel_id}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.channel_handle ? `@${c.channel_handle} · ` : ""}
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10 rounded-xl border border-border bg-card/50 p-5 text-sm text-muted-foreground">
          Curious how reviews work?{" "}
          <Link to="/trust" className="text-primary underline-offset-4 hover:underline">Read the trust policy →</Link>
        </div>
      </div>
    </div>
  );
};

export default Creators;
