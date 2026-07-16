import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";
import { Loader2, PlayCircle, Radar, ShieldCheck, ShieldAlert, ExternalLink } from "lucide-react";

type Candidate = {
  id: string;
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  description: string | null;
  subscriber_count: number | null;
  source: string;
  status: string;
  priority_score: number;
  halal_topic_hint: string | null;
  discovery_method: string | null;
  source_channel_id: string | null;
  duplicate_risk: string | null;
  created_at: string;
};

const AdminDiscovery = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [quotaUsed, setQuotaUsed] = useState<number | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | "all">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("channel_candidates")
      .select(
        "id, youtube_channel_id, title, handle, description, subscriber_count, source, status, priority_score, halal_topic_hint, discovery_method, source_channel_id, duplicate_risk, created_at",
      )
      .eq("source", "discovery")
      .eq("status", "pending")
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as Candidate[]);
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data: q } = await supabase
      .from("discovery_quota_ledger")
      .select("units_used")
      .eq("day", today)
      .eq("api_name", "youtube_v3")
      .maybeSingle();
    setQuotaUsed((q?.units_used as number | undefined) ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const runCrawl = async () => {
    setCrawling(true);
    try {
      const { data, error } = await supabase.functions.invoke("discover-channels", { body: {} });
      if (error) throw error;
      toast({
        title: "Discovery run complete",
        description: `Enqueued ${data?.enqueued ?? 0} · skipped ${data?.skipped ?? 0} · quota ${data?.quota_used_this_run ?? 0}`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Discovery failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setCrawling(false);
    }
  };

  const verifyOne = async (c: Candidate) => {
    setVerifyingId(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("verify-channel", {
        body: {
          youtube_channel_id: c.youtube_channel_id,
          handle: c.handle,
          title: c.title,
          category: c.halal_topic_hint,
          source: "discovery",
        },
      });
      if (error) throw error;
      toast({
        title: `Verified: ${data?.status ?? "?"}`,
        description: `Confidence ${data?.confidence ?? 0}`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Verify failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  const reject = async (c: Candidate) => {
    const { error } = await supabase
      .from("channel_candidates")
      .update({ status: "rejected" })
      .eq("id", c.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Rejected" });
    setRows((r) => r.filter((x) => x.id !== c.id));
  };

  const topics = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.halal_topic_hint && s.add(r.halal_topic_hint));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(
    () => (topicFilter === "all" ? rows : rows.filter((r) => r.halal_topic_hint === topicFilter)),
    [rows, topicFilter],
  );

  if (roleLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="mx-auto max-w-6xl p-6">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="mx-auto max-w-6xl p-6">
          <EmptyState
            icon={ShieldAlert}
            title="Admins only"
            description="This page is restricted to platform admins."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-16">
      <SEO
        title="Creator Discovery Queue — Heartify Admin"
        description="Review halal-candidate channels surfaced by the automated discovery crawler."
        path="/admin/discovery"
      />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Creator Discovery</h1>
            <p className="text-sm text-muted-foreground">
              Automated crawls from approved channels. Every candidate must pass full moderation before approval.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {quotaUsed !== null && (
              <span className="text-xs text-muted-foreground">
                YouTube quota today: <strong>{quotaUsed}</strong>
              </span>
            )}
            <Button onClick={runCrawl} disabled={crawling} className="min-h-11">
              {crawling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
              Run discovery now
            </Button>
            <Button variant="outline" asChild className="min-h-11">
              <Link to="/admin/review">Full review queue</Link>
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setTopicFilter("all")}
            className={`min-h-11 rounded-pill border px-3 py-1.5 text-sm font-medium ${topicFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            All ({rows.length})
          </button>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setTopicFilter(t)}
              className={`min-h-11 rounded-pill border px-3 py-1.5 text-sm font-medium capitalize ${topicFilter === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Radar}
            title="Queue is empty"
            description="Run a discovery crawl to surface new halal-candidate creators."
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{c.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {c.handle ?? c.youtube_channel_id} · {c.subscriber_count?.toLocaleString() ?? "?"} subs
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.halal_topic_hint && (
                        <Badge variant="secondary" className="capitalize">
                          {c.halal_topic_hint}
                        </Badge>
                      )}
                      <Badge variant="outline">priority {c.priority_score}</Badge>
                      {c.duplicate_risk && (
                        <Badge variant={c.duplicate_risk === "high" ? "destructive" : "outline"}>
                          dup: {c.duplicate_risk}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => verifyOne(c)}
                      disabled={verifyingId === c.id}
                      className="min-h-11"
                    >
                      {verifyingId === c.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-2 h-4 w-4" />
                      )}
                      Run full moderation
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(c)} className="min-h-11">
                      Reject
                    </Button>
                    <Button size="sm" variant="ghost" asChild className="min-h-11">
                      <a
                        href={`https://www.youtube.com/channel/${c.youtube_channel_id}`}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open on YouTube
                      </a>
                    </Button>
                    {c.discovery_method && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        via {c.discovery_method}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDiscovery;
