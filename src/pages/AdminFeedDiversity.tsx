import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";

const db = supabase as unknown as {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;
  from: (t: string) => any;
};

const SURFACES = [
  "for_you", "browse", "listen", "recently_added", "trending",
  "continue_watching", "hidden_gems", "new_channels", "new_videos",
  "because_you_watched", "popular_this_week",
];

const ANY = "__any__";

type Cohort = { id: string; key: string; name: string };
type Bucket = Record<string, string | number>;
type Dashboard = {
  since: string;
  overall: Record<string, number>;
  by_variant: Bucket[];
  by_surface: Bucket[];
  by_language: Bucket[];
  by_device: Bucket[];
  by_diversity_bucket: Bucket[];
};
type Trace = {
  id: number;
  created_at: string;
  user_id: string | null;
  session_id: string | null;
  surface: string;
  variant: string;
  cold_start: boolean;
  cold_start_strategy: string | null;
  diversity_level: number | null;
  ui_language: string | null;
  device_class: string | null;
  browser: string | null;
  config_version: string | null;
  item_count: number;
  pool_size: number;
  distinct_channels: number;
  distinct_categories: number;
  distinct_languages: number;
  max_per_channel: number;
  duplicate_count: number;
  self_overlap: number | null;
  fresh_share: number | null;
  took_ms: number;
  guarantees: Record<string, boolean>;
  trace: Record<string, unknown>;
  item_ids: string[];
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-micro text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: Bucket[] }) {
  const cols = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);
  return (
    <Card className="p-5 overflow-x-auto">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-micro text-muted-foreground">No data in this slice.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-micro text-muted-foreground">
            <tr>{cols.map((c) => <th key={c} className="text-left py-1 pr-4 font-normal">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {cols.map((c) => (
                  <th key={c} scope={c === "key" ? "row" : undefined} className="text-left py-2 pr-4 font-normal tabular-nums">
                    {String(r[c] ?? "—")}
                  </th>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default function AdminFeedDiversity() {
  // Filters
  const [hours, setHours] = useState(24);
  const [cohortId, setCohortId] = useState<string>(ANY);
  const [minDiv, setMinDiv] = useState("");
  const [maxDiv, setMaxDiv] = useState("");
  const [language, setLanguage] = useState("");
  const [surface, setSurface] = useState<string>(ANY);
  const [variant, setVariant] = useState("");
  const [deviceClass, setDeviceClass] = useState<string>(ANY);

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);

  // Trace view
  const [traceUser, setTraceUser] = useState("");
  const [traceSession, setTraceSession] = useState("");
  const [traces, setTraces] = useState<Trace[]>([]);
  const [openTrace, setOpenTrace] = useState<number | null>(null);

  // Runtime flag
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [flagKilled, setFlagKilled] = useState(false);
  const [rulesText, setRulesText] = useState("{}");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const { data: d, error } = await db.rpc("feed_diversity_dashboard_filtered", {
      _hours: hours,
      _cohort_id: cohortId === ANY ? null : cohortId,
      _min_diversity: minDiv === "" ? null : Number(minDiv),
      _max_diversity: maxDiv === "" ? null : Number(maxDiv),
      _language: language.trim() || null,
      _surface: surface === ANY ? null : surface,
      _variant: variant.trim() || null,
      _device_class: deviceClass === ANY ? null : deviceClass,
    });
    setLoading(false);
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    setData(d as Dashboard);
  }, [hours, cohortId, minDiv, maxDiv, language, surface, variant, deviceClass]);

  const loadTraces = useCallback(async () => {
    const { data: d, error } = await db.rpc("admin_feed_traces", {
      _hours: hours,
      _user_id: traceUser.trim() || null,
      _session_id: traceSession.trim() || null,
      _surface: surface === ANY ? null : surface,
      _limit: 50,
    });
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    setTraces((d as Trace[]) ?? []);
  }, [hours, traceUser, traceSession, surface]);

  const loadFlag = useCallback(async () => {
    const { data: f } = await db
      .from("feature_flags")
      .select("enabled, kill_switch, targeting_rules")
      .eq("key", "feed.slider_personalization")
      .maybeSingle();
    if (f) {
      setFlagEnabled(!!f.enabled);
      setFlagKilled(!!f.kill_switch);
      setRulesText(JSON.stringify(f.targeting_rules ?? {}, null, 2));
    }
  }, []);

  useEffect(() => {
    db.from("user_cohorts").select("id,key,name").order("name")
      .then(({ data: c }: { data: Cohort[] | null }) => setCohorts(c ?? []));
    loadFlag();
    loadDashboard();
    loadTraces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveFlag(patch: Record<string, unknown>) {
    const { error } = await db.from("feature_flags").update(patch).eq("key", "feed.slider_personalization");
    if (error) toast({ title: error.message, variant: "destructive" });
    else { toast({ title: "Feed config updated — live within ~20s." }); loadFlag(); }
  }

  function saveWeights() {
    try {
      const parsed = JSON.parse(rulesText);
      saveFlag({ targeting_rules: parsed });
    } catch {
      toast({ title: "Invalid JSON", variant: "destructive" });
    }
  }

  const o = data?.overall ?? {};

  return (
    <>
      <SEO path="/admin/feed-diversity" title="Feed diversity — Heartify" description="Per-cohort feed diversity metrics, runtime feed config, and per-user retrieval traces." />
      <PageHeader title="Feed diversity" subtitle="Slice metrics by cohort, slider range and language — and trace any request." backHref="/admin" />

      <div className="container mx-auto max-w-6xl px-4 pb-16 space-y-6">
        {/* Runtime rollback control */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Runtime feed config</h2>
              <p className="text-micro text-muted-foreground">
                Kill switch reverts every request to the legacy, non-slider assembly — no redeploy.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <span>Enabled</span>
                <Switch checked={flagEnabled} onCheckedChange={(v) => { setFlagEnabled(v); saveFlag({ enabled: v }); }} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span>Kill switch</span>
                <Switch checked={flagKilled} onCheckedChange={(v) => { setFlagKilled(v); saveFlag({ kill_switch: v }); }} />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weights">Bucketing weights &amp; caps (JSON)</Label>
            <Textarea id="weights" rows={10} className="font-mono text-micro" value={rulesText} onChange={(e) => setRulesText(e.target.value)} />
            <Button size="sm" onClick={saveWeights}>Save weights</Button>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold">Segment filters</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="hours">Window (hours)</Label>
              <Input id="hours" type="number" min={1} max={720} value={hours} onChange={(e) => setHours(Number(e.target.value) || 24)} />
            </div>
            <div className="space-y-1">
              <Label>Cohort</Label>
              <Select value={cohortId} onValueChange={setCohortId}>
                <SelectTrigger><SelectValue placeholder="All users" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All users</SelectItem>
                  {cohorts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mind">Slider min</Label>
              <Input id="mind" type="number" min={0} max={100} placeholder="0" value={minDiv} onChange={(e) => setMinDiv(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxd">Slider max</Label>
              <Input id="maxd" type="number" min={0} max={100} placeholder="100" value={maxDiv} onChange={(e) => setMaxDiv(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lang">Language</Label>
              <Input id="lang" placeholder="en, bn, ur…" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Surface</Label>
              <Select value={surface} onValueChange={setSurface}>
                <SelectTrigger><SelectValue placeholder="All surfaces" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All surfaces</SelectItem>
                  {SURFACES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="variant">Variant</Label>
              <Input id="variant" placeholder="control / treatment" value={variant} onChange={(e) => setVariant(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Device</Label>
              <Select value={deviceClass} onValueChange={setDeviceClass}>
                <SelectTrigger><SelectValue placeholder="All devices" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All devices</SelectItem>
                  <SelectItem value="phone">phone</SelectItem>
                  <SelectItem value="tablet">tablet</SelectItem>
                  <SelectItem value="desktop">desktop</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={loadDashboard} disabled={loading}>{loading ? "Loading…" : "Apply filters"}</Button>
        </Card>

        {/* Overall */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Overall (filtered slice)</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Stat label="Requests" value={o.requests ?? 0} />
            <Stat label="Users" value={o.users ?? 0} />
            <Stat label="Avg items" value={o.avg_items ?? 0} />
            <Stat label="Duplicate rate" value={`${((Number(o.duplicate_rate) || 0) * 100).toFixed(2)}%`} />
            <Stat label="Cold-start rate" value={`${((Number(o.cold_start_rate) || 0) * 100).toFixed(1)}%`} />
            <Stat label="Avg channels" value={o.avg_distinct_channels ?? 0} />
            <Stat label="Avg categories" value={o.avg_distinct_categories ?? 0} />
            <Stat label="Avg languages" value={o.avg_distinct_languages ?? 0} />
            <Stat label="Avg self-overlap" value={`${((Number(o.avg_self_overlap) || 0) * 100).toFixed(1)}%`} />
            <Stat label="Avg fresh share" value={`${((Number(o.avg_fresh_share) || 0) * 100).toFixed(1)}%`} />
            <Stat label="p50 latency" value={`${o.p50_took_ms ?? 0} ms`} />
            <Stat label="p95 latency" value={`${o.p95_took_ms ?? 0} ms`} />
          </div>
        </Card>

        <BreakdownTable title="By variant" rows={data?.by_variant ?? []} />
        <BreakdownTable title="By slider range" rows={data?.by_diversity_bucket ?? []} />
        <BreakdownTable title="By language" rows={data?.by_language ?? []} />
        <BreakdownTable title="By surface" rows={data?.by_surface ?? []} />
        <BreakdownTable title="By device" rows={data?.by_device ?? []} />

        {/* Per-user trace */}
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Per-user feed trace</h2>
            <p className="text-micro text-muted-foreground">
              Exact diversity parameters and retrieval decisions used for each request.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="tu">User ID</Label>
              <Input id="tu" placeholder="uuid" value={traceUser} onChange={(e) => setTraceUser(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ts">Session ID</Label>
              <Input id="ts" placeholder="session" value={traceSession} onChange={(e) => setTraceSession(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={loadTraces}>Load traces</Button>
            </div>
          </div>

          <div className="space-y-2">
            {traces.length === 0 && <p className="text-micro text-muted-foreground">No traces for this slice.</p>}
            {traces.map((t) => (
              <div key={t.id} className="rounded-lg border border-border">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 min-h-[44px] flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                  onClick={() => setOpenTrace(openTrace === t.id ? null : t.id)}
                  aria-expanded={openTrace === t.id}
                >
                  <span className="font-mono text-micro">{new Date(t.created_at).toLocaleString()}</span>
                  <span className="font-medium">{t.surface}</span>
                  <span className="text-muted-foreground">variant {t.variant}</span>
                  <span className="text-muted-foreground">slider {t.diversity_level ?? "—"}</span>
                  <span className="text-muted-foreground">{t.device_class ?? "—"}/{t.browser ?? "—"}</span>
                  <span className="text-muted-foreground">{t.item_count} items · {t.distinct_channels} channels</span>
                  {t.cold_start && <span className="text-muted-foreground">cold: {t.cold_start_strategy}</span>}
                  <span className="text-muted-foreground">{t.took_ms} ms</span>
                </button>
                {openTrace === t.id && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                      <Stat label="Pool size" value={t.pool_size} />
                      <Stat label="Max/channel" value={t.max_per_channel} />
                      <Stat label="Duplicates" value={t.duplicate_count} />
                      <Stat label="Self-overlap" value={t.self_overlap === null ? "—" : `${(t.self_overlap * 100).toFixed(1)}%`} />
                    </div>
                    <div>
                      <h3 className="text-micro text-muted-foreground mb-1">Guarantees</h3>
                      <pre className="text-micro font-mono whitespace-pre-wrap">{JSON.stringify(t.guarantees, null, 2)}</pre>
                    </div>
                    <div>
                      <h3 className="text-micro text-muted-foreground mb-1">Retrieval decisions</h3>
                      <pre className="text-micro font-mono whitespace-pre-wrap">{JSON.stringify(t.trace, null, 2)}</pre>
                    </div>
                    <div>
                      <h3 className="text-micro text-muted-foreground mb-1">Item IDs</h3>
                      <p className="text-micro font-mono break-all">{(t.item_ids ?? []).join(", ") || "—"}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
