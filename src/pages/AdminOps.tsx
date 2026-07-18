import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { Loader2, RefreshCcw } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface Allocation {
  source: string;
  share_percent: number;
  enabled: boolean;
  updated_at?: string;
}

interface Dashboard {
  generated_at: string;
  jobs: {
    active: number;
    succeeded_24h: number;
    failed_24h: number;
    cancelled_24h: number;
    last_10: any[];
  };
  quota: { today_units: number; per_api: Record<string, number> };
  allocations: Allocation[];
  candidates: { pending: number; approved_24h: number; rejected_24h: number };
  moderation: { pending_reports: number; resolved_24h: number };
  alerts_open: number;
  dlq_open: number;
  users: { dau: number; wau: number };
  metrics_recent: Array<{ metric: string; value: number; tags: any; ts: string }>;
}

export default function AdminOps() {
  const { hasMinRole } = usePermissions();
  const isOwner = hasMinRole("owner");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [dlq, setDlq] = useState<any[]>([]);
  const [poolMix, setPoolMix] = useState<Record<string, number> | null>(null);
  const [poolMixEdits, setPoolMixEdits] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: dash, error }, { data: q }, { data: mix }] = await Promise.all([
      supabase.rpc("get_ops_dashboard"),
      supabase.from("dead_letter_queue").select("*").is("resolved_at", null).order("created_at", { ascending: false }).limit(25),
      supabase.from("_internal_config").select("value").eq("key", "reco_pool_mix").maybeSingle(),
    ]);
    if (error) toast({ title: "Dashboard failed", description: error.message, variant: "destructive" });
    setData(dash as any);
    setDlq((q as any[]) ?? []);
    setPoolMix(((mix?.value as unknown) as Record<string, number>) ?? null);
    setLoading(false);
  };

  useEffect(() => { void load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);

  const totalShare = useMemo(
    () => (data?.allocations ?? []).reduce((s, a) => s + Number(a.share_percent || 0), 0),
    [data],
  );

  const saveAllocation = async (source: string) => {
    const raw = edits[source];
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast({ title: "Invalid percent", description: "Enter 0–100", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("discovery_quota_allocations")
      .update({ share_percent: value, updated_at: new Date().toISOString() })
      .eq("source", source);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved", description: `${source}: ${value}%` }); void load(); }
  };

  const resolveDlq = async (id: string) => {
    const { error } = await supabase
      .from("dead_letter_queue")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast({ title: "Resolve failed", description: error.message, variant: "destructive" });
    else void load();
  };

  const savePoolMix = async () => {
    if (!poolMix) return;
    const next: Record<string, number> = { ...poolMix };
    for (const [k, v] of Object.entries(poolMixEdits)) {
      const num = Number(v);
      if (!Number.isFinite(num) || num < 0 || num > 1) {
        toast({ title: "Invalid weight", description: `${k}: enter 0–1`, variant: "destructive" });
        return;
      }
      next[k] = num;
    }
    const { error } = await supabase
      .from("_internal_config")
      .update({ value: next as unknown as string, updated_at: new Date().toISOString() })
      .eq("key", "reco_pool_mix");
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Pool mix saved" }); setPoolMixEdits({}); void load(); }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <SEO title="Operations · Heartify" description="Owner operations dashboard" path="/admin/ops" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Operations</h1>
          <p className="text-sm text-muted-foreground">Reliability &amp; observability · updated {data?.generated_at ? new Date(data.generated_at).toLocaleTimeString() : "—"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active jobs" value={data?.jobs.active ?? 0} />
        <StatCard label="Succeeded 24h" value={data?.jobs.succeeded_24h ?? 0} />
        <StatCard label="Failed 24h" value={data?.jobs.failed_24h ?? 0} tone={data && data.jobs.failed_24h > 0 ? "warn" : undefined} />
        <StatCard label="Open alerts" value={data?.alerts_open ?? 0} tone={data && data.alerts_open > 0 ? "warn" : undefined} />
        <StatCard label="Quota today" value={data?.quota.today_units ?? 0} sub={`/ 4000 daily cap`} />
        <StatCard label="Candidates pending" value={data?.candidates.pending ?? 0} />
        <StatCard label="Reports pending" value={data?.moderation.pending_reports ?? 0} />
        <StatCard label="DLQ open" value={data?.dlq_open ?? 0} tone={data && data.dlq_open > 0 ? "warn" : undefined} />
        <StatCard label="DAU" value={data?.users.dau ?? 0} />
        <StatCard label="WAU" value={data?.users.wau ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discovery quota allocation</CardTitle>
          <p className="text-xs text-muted-foreground">
            Weights determine each source's share of the daily YouTube budget. Total: <Badge variant={totalShare === 100 ? "secondary" : "destructive"}>{totalShare}%</Badge>
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.allocations ?? []).map((a) => (
            <div key={a.source} className="flex items-center gap-3">
              <div className="w-48 text-sm font-medium">{a.source}</div>
              <Input
                type="number"
                min={0}
                max={100}
                defaultValue={a.share_percent}
                onChange={(e) => setEdits((s) => ({ ...s, [a.source]: e.target.value }))}
                className="w-28"
                disabled={!isOwner}
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Button size="sm" onClick={() => saveAllocation(a.source)} disabled={!isOwner}>Save</Button>
            </div>
          ))}
          {!isOwner && <p className="text-xs text-muted-foreground">Owner role required to edit.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent discovery jobs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data?.jobs.last_10 ?? []).map((j: any) => (
              <div key={j.id} className="flex items-center justify-between text-sm border-b border-border/40 py-2">
                <div className="min-w-0">
                  <div className="font-mono text-xs truncate">{j.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {j.mode} · seeds {j.seeds_processed} · enqueued {j.enqueued_count} · quota {j.quota_used} · failures {j.api_failures}
                  </div>
                  {j.error && <div className="text-xs text-destructive truncate">{j.error}</div>}
                </div>
                <Badge variant={j.status === "succeeded" ? "secondary" : j.status === "failed" ? "destructive" : "outline"}>{j.status}</Badge>
              </div>
            ))}
            {(!data?.jobs.last_10 || data.jobs.last_10.length === 0) && <p className="text-sm text-muted-foreground">No jobs yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dead letter queue ({dlq.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dlq.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b border-border/40 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{d.job_type}</div>
                  <div className="text-xs text-destructive truncate max-w-xl">{d.error}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                </div>
                {isOwner && <Button size="sm" variant="outline" onClick={() => resolveDlq(d.id)}>Resolve</Button>}
              </div>
            ))}
            {dlq.length === 0 && <p className="text-sm text-muted-foreground">All clear.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent metrics</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-72 overflow-auto text-xs font-mono">
            {(data?.metrics_recent ?? []).map((m, i) => (
              <div key={i} className="flex justify-between border-b border-border/30 py-1">
                <span>{m.metric}</span>
                <span>{m.value}</span>
                <span className="text-muted-foreground">{new Date(m.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${tone === "warn" ? "text-destructive" : ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
