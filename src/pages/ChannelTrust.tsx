import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, ShieldCheck, TrendingUp, AlertTriangle, RefreshCcw, History } from "lucide-react";

interface Profile {
  id: string;
  channel_id: string;
  youtube_channel_id: string | null;
  trust_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  strike_count: number;
  manual_approval_count: number;
  manual_rejection_count: number;
  avg_ai_confidence: number | null;
  false_positive_count: number;
  false_negative_count: number;
  user_report_count: number;
  category_consistency: number | null;
  upload_frequency_per_week: number | null;
  historical_quality: number | null;
  review_frequency_days: number | null;
  total_videos: number;
  approved_videos: number;
  rejected_videos: number;
  last_recomputed_at: string | null;
  notes: string | null;
}

interface TrustEvent {
  created_at: string;
  source: string;
  delta: number;
  score_before: number | null;
  score_after: number | null;
  reason: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface Channel { id: string; title: string; youtube_channel_id: string }

const riskColor: Record<Profile["risk_level"], string> = {
  low: "bg-emerald-500/15 text-emerald-500",
  medium: "bg-amber-500/15 text-amber-500",
  high: "bg-orange-500/15 text-orange-500",
  critical: "bg-red-500/15 text-red-500",
};

const ChannelTrust = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [channels, setChannels] = useState<Record<string, Channel>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TrustEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user]);

  const loadProfiles = async () => {
    const [{ data: profs }, { data: chs }] = await Promise.all([
      supabase.from("channel_trust_profiles" as never).select("*").order("trust_score", { ascending: true }).limit(500),
      supabase.from("approved_channels").select("id,title,youtube_channel_id").limit(1000),
    ]);
    setProfiles((profs as unknown as Profile[]) ?? []);
    const idx: Record<string, Channel> = {};
    for (const c of (chs as unknown as Channel[]) ?? []) idx[c.id] = c;
    setChannels(idx);
  };

  useEffect(() => { if (isAdmin) loadProfiles(); }, [isAdmin]);

  const loadHistory = async (id: string) => {
    setSelectedId(id);
    const { data } = await supabase.rpc("get_channel_trust_history" as never, { _channel_id: id, _limit: 100 });
    setHistory((data as unknown as TrustEvent[]) ?? []);
  };

  const recomputeOne = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("recompute-channel-trust", { body: { channel_id: id } });
      if (error) throw error;
      toast({ title: "Recomputed", description: "Trust score refreshed." });
      await loadProfiles();
      if (selectedId === id) await loadHistory(id);
    } catch (e) {
      toast({ title: "Failed", description: String((e as Error).message ?? e), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const recomputeAll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("recompute-channel-trust", { body: { all: true, limit: 500 } });
      if (error) throw error;
      toast({ title: "Batch recompute complete", description: `Refreshed ${(data as { recomputed?: number })?.recomputed ?? 0} channels.` });
      await loadProfiles();
    } catch (e) {
      toast({ title: "Failed", description: String((e as Error).message ?? e), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const c = channels[p.channel_id];
      return c?.title?.toLowerCase().includes(q) || p.youtube_channel_id?.toLowerCase().includes(q);
    });
  }, [profiles, channels, filter]);

  const stats = useMemo(() => {
    const total = profiles.length;
    const avg = total ? profiles.reduce((a, b) => a + Number(b.trust_score), 0) / total : 0;
    const critical = profiles.filter((p) => p.risk_level === "critical").length;
    const high = profiles.filter((p) => p.risk_level === "high").length;
    return { total, avg, critical, high };
  }, [profiles]);

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-muted-foreground">
          Admins only.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Channel Trust & Reputation
            </h1>
            <p className="text-sm text-muted-foreground">
              Dynamic trust profiles powering search, recommendations, and moderation.
            </p>
          </div>
          <Button onClick={recomputeAll} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Recompute all
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Profiles" value={String(stats.total)} />
          <StatCard label="Avg trust" value={stats.avg.toFixed(1)} />
          <StatCard label="High risk" value={String(stats.high)} tone="warn" />
          <StatCard label="Critical" value={String(stats.critical)} tone="danger" />
        </div>

        <Input
          placeholder="Filter by channel name or YouTube id…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-md"
        />

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Channels (lowest trust first)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-auto divide-y divide-border">
                {filtered.map((p) => {
                  const c = channels[p.channel_id];
                  return (
                    <button
                      key={p.id}
                      onClick={() => loadHistory(p.channel_id)}
                      className={`w-full text-left p-3 hover:bg-muted transition ${selectedId === p.channel_id ? "bg-muted" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c?.title ?? p.youtube_channel_id ?? p.channel_id}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p.total_videos} videos · {p.approved_videos} approved · {p.rejected_videos} rejected
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={riskColor[p.risk_level]}>{p.risk_level}</Badge>
                          <div className="text-lg font-semibold w-12 text-right">{Number(p.trust_score).toFixed(0)}</div>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); recomputeOne(p.channel_id); }}>
                            <RefreshCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No trust profiles yet.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Score history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedId && <div className="text-sm text-muted-foreground">Select a channel to see its score history.</div>}
              {selectedId && (
                <Sparkline events={history} />
              )}
              <div className="max-h-[52vh] overflow-auto space-y-2">
                {history.map((ev, i) => (
                  <div key={i} className="text-xs border rounded p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium capitalize">{ev.source.replaceAll("_", " ")}</span>
                      <span className={ev.delta >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {ev.delta >= 0 ? "+" : ""}{Number(ev.delta).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {Number(ev.score_before ?? 0).toFixed(1)} → {Number(ev.score_after ?? 0).toFixed(1)}
                    </div>
                    {ev.reason && <div className="mt-1">{ev.reason}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, tone }: { label: string; value: string; tone?: "warn" | "danger" }) => (
  <Card>
    <CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${tone === "danger" ? "text-red-500" : tone === "warn" ? "text-orange-500" : ""}`}>{value}</div>
    </CardContent>
  </Card>
);

const Sparkline = ({ events }: { events: TrustEvent[] }) => {
  const pts = [...events].reverse().map((e) => Number(e.score_after ?? 0));
  if (pts.length < 2) return <div className="h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">Not enough history yet.</div>;
  const w = 300, h = 64;
  const min = Math.min(...pts), max = Math.max(...pts);
  const span = Math.max(1, max - min);
  const path = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
    </svg>
  );
};

export default ChannelTrust;
