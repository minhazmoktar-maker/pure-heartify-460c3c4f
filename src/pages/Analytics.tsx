import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Download, RefreshCcw, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

// --- helpers -----------------------------------------------------------------

const iso = (d: Date) => d.toISOString();
const toCsv = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};
const downloadCsv = (name: string, rows: Record<string, unknown>[]) => {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};
const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

// Untyped shim so we can call the new admin RPCs without waiting for a types regen.
const rpc = async <T,>(name: string, args: Record<string, unknown>): Promise<T> => {
  const client = supabase as unknown as { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
};

// --- types -------------------------------------------------------------------

interface ActiveUsersRow { day: string; dau: number; wau: number; mau: number }
interface SessionRow { day: string; sessions: number; avg_seconds: number; median_seconds: number }
interface DoseRow { day: string; dose_users: number; completions: number; completion_rate: number }
interface FavRow { day: string; new_favorites: number; cumulative: number }
interface CatRow { category: string; watches: number; searches: number }
interface HistoRow { bucket: number; count: number }
interface GeoRow { country: string; sessions: number; users: number }
interface RetentionRow { cohort_week: string; week_offset: number; cohort_size: number; retained: number; retention_pct: number }
interface SearchStats {
  total: number; zero_result_rate: number; click_through_rate: number; unique_queries: number;
  daily: { day: string; searches: number; zero_results: number; clicked: number }[];
  top_queries: { query: string; hits: number }[];
}
interface RecStats {
  impressions: number; clicks: number; dismisses: number; conversions: number;
  ctr: number; convert_rate: number;
  daily: { day: string; impressions: number; clicks: number; conversions: number }[];
}
interface WatchStats { daily: { day: string; watches: number; viewers: number }[]; top_channels: { channel_title: string; watches: number }[] }
interface ModStats { by_state: { state: string; total: number }[]; total_decisions: number; false_positive: number; false_negative: number; manual_overrides: number; accuracy_pct: number | null }
interface ChannelGrowth { daily: { day: string; added: number }[]; risk_distribution: { risk: string; n: number }[] }
interface Engagement { active_users: number; avg_events: number; p50: number; p90: number; p99: number; top_events: { event_name: string; n: number }[] }
interface DeviceStats { device: { device: string; n: number }[]; platform: { platform: string; n: number }[]; viewport: { viewport: string; n: number }[] }
interface Perf { samples: number; avg_ms: number | null; p50_ms: number | null; p90_ms: number | null; p99_ms: number | null }

// --- page --------------------------------------------------------------------

const Analytics = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const [from, setFrom] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; });
  const [to, setTo] = useState<Date>(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; });

  const [activeUsers, setActiveUsers] = useState<ActiveUsersRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [search, setSearch] = useState<SearchStats | null>(null);
  const [rec, setRec] = useState<RecStats | null>(null);
  const [dose, setDose] = useState<DoseRow[]>([]);
  const [favs, setFavs] = useState<FavRow[]>([]);
  const [watch, setWatch] = useState<WatchStats | null>(null);
  const [mod, setMod] = useState<ModStats | null>(null);
  const [histo, setHisto] = useState<HistoRow[]>([]);
  const [growth, setGrowth] = useState<ChannelGrowth | null>(null);
  const [cats, setCats] = useState<CatRow[]>([]);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [geo, setGeo] = useState<GeoRow[]>([]);
  const [device, setDevice] = useState<DeviceStats | null>(null);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [retention, setRetention] = useState<RetentionRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user]);

  const loadAll = async () => {
    setBusy(true);
    const _from = iso(from), _to = iso(to);
    try {
      const [au, ss, se, re, ds, fs, ws, ms, hs, cg, cp, eg, gd, dv, pf, rt] = await Promise.all([
        rpc<ActiveUsersRow[]>("analytics_active_users", { _from, _to }),
        rpc<SessionRow[]>("analytics_session_stats", { _from, _to }),
        rpc<SearchStats>("analytics_search_stats", { _from, _to }),
        rpc<RecStats>("analytics_recommendation_stats", { _from, _to }),
        rpc<DoseRow[]>("analytics_dose_stats", { _from, _to }),
        rpc<FavRow[]>("analytics_favorites_stats", { _from, _to }),
        rpc<WatchStats>("analytics_watch_stats", { _from, _to }),
        rpc<ModStats>("analytics_moderation_stats", { _from, _to }),
        rpc<HistoRow[]>("analytics_ai_confidence_histogram", { _from, _to }),
        rpc<ChannelGrowth>("analytics_channel_growth", { _from, _to }),
        rpc<CatRow[]>("analytics_category_popularity", { _from, _to }),
        rpc<Engagement>("analytics_engagement", { _from, _to }),
        rpc<GeoRow[]>("analytics_geo_distribution", { _from, _to }),
        rpc<DeviceStats>("analytics_device_stats", { _from, _to }),
        rpc<Perf>("analytics_performance", { _from, _to }),
        rpc<RetentionRow[]>("analytics_retention", { _cohort_from: iso(new Date(Date.now() - 90 * 86400000)), _weeks: 8 }),
      ]);
      setActiveUsers(au ?? []); setSessions(ss ?? []); setSearch(se); setRec(re); setDose(ds ?? []);
      setFavs(fs ?? []); setWatch(ws); setMod(ms); setHisto(hs ?? []); setGrowth(cg); setCats(cp ?? []);
      setEngagement(eg); setGeo(gd ?? []); setDevice(dv); setPerf(pf); setRetention(rt ?? []);
    } catch (e) {
      toast({ title: "Failed to load analytics", description: String((e as Error).message ?? e), variant: "destructive" });
    } finally { setBusy(false); }
  };

  useEffect(() => { if (isAdmin) loadAll(); /* eslint-disable-next-line */ }, [isAdmin]);

  const kpi = useMemo(() => {
    const last = activeUsers[activeUsers.length - 1];
    return {
      dau: last?.dau ?? 0, wau: last?.wau ?? 0, mau: last?.mau ?? 0,
      searchCtr: search?.click_through_rate ?? 0,
      recCtr: rec?.ctr ?? 0,
      modAcc: mod?.accuracy_pct ?? 0,
    };
  }, [activeUsers, search, rec, mod]);

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-muted-foreground">Admins only.</div>
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
              <BarChart3 className="h-6 w-6 text-primary" /> Analytics BI
            </h1>
            <p className="text-sm text-muted-foreground">Aggregate-only metrics. No raw user data leaves the database.</p>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from.toISOString().slice(0, 10)}
                onChange={(e) => { const d = new Date(e.target.value); d.setHours(0, 0, 0, 0); setFrom(d); }} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to.toISOString().slice(0, 10)}
                onChange={(e) => { const d = new Date(e.target.value); d.setHours(23, 59, 59, 999); setTo(d); }} />
            </div>
            <Button onClick={loadAll} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi label="DAU" value={kpi.dau} />
          <Kpi label="WAU" value={kpi.wau} />
          <Kpi label="MAU" value={kpi.mau} />
          <Kpi label="Search CTR" value={`${kpi.searchCtr}%`} />
          <Kpi label="Rec CTR" value={`${kpi.recCtr}%`} />
          <Kpi label="Mod accuracy" value={`${kpi.modAcc}%`} />
        </div>

        <Panel title="Active users" data={activeUsers} filename="active_users.csv">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={activeUsers}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="dau" stroke={CHART_COLORS[0]} />
              <Line type="monotone" dataKey="wau" stroke={CHART_COLORS[1]} />
              <Line type="monotone" dataKey="mau" stroke={CHART_COLORS[2]} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Session duration" data={sessions} filename="sessions.csv">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sessions}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                <Area type="monotone" dataKey="avg_seconds" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.25} />
                <Area type="monotone" dataKey="median_seconds" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Retention (weekly cohorts)" data={retention} filename="retention.csv">
            <div className="max-h-[240px] overflow-auto text-xs">
              <table className="w-full">
                <thead className="text-left text-muted-foreground">
                  <tr><th>Cohort</th><th>Size</th><th>W0</th><th>W1</th><th>W2</th><th>W4</th><th>W8</th></tr>
                </thead>
                <tbody>
                  {Object.entries(groupRetention(retention)).map(([w, cells]) => (
                    <tr key={w} className="border-t border-border">
                      <td>{w}</td><td>{cells.size}</td>
                      <td>{cells[0] ?? "—"}</td><td>{cells[1] ?? "—"}</td>
                      <td>{cells[2] ?? "—"}</td><td>{cells[4] ?? "—"}</td><td>{cells[8] ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Search performance" data={search?.daily ?? []} filename="search.csv">
            <div className="text-sm text-muted-foreground mb-2">
              {search?.total ?? 0} searches · {search?.zero_result_rate ?? 0}% zero-result · {search?.click_through_rate ?? 0}% CTR
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={search?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                <Bar dataKey="searches" fill={CHART_COLORS[0]} />
                <Bar dataKey="zero_results" fill={CHART_COLORS[3]} />
                <Bar dataKey="clicked" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Recommendation CTR" data={rec?.daily ?? []} filename="recommendations.csv">
            <div className="text-sm text-muted-foreground mb-2">
              {rec?.impressions ?? 0} imps · {rec?.clicks ?? 0} clicks ({rec?.ctr ?? 0}%) · {rec?.conversions ?? 0} converts
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rec?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                <Line type="monotone" dataKey="impressions" stroke={CHART_COLORS[0]} />
                <Line type="monotone" dataKey="clicks" stroke={CHART_COLORS[1]} />
                <Line type="monotone" dataKey="conversions" stroke={CHART_COLORS[2]} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Daily Dose completion" data={dose} filename="dose.csv">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dose}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                <Bar dataKey="dose_users" fill={CHART_COLORS[0]} />
                <Bar dataKey="completions" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Favorites growth" data={favs} filename="favorites.csv">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={favs}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                <Area type="monotone" dataKey="cumulative" stroke={CHART_COLORS[4]} fill={CHART_COLORS[4]} fillOpacity={0.3} />
                <Line type="monotone" dataKey="new_favorites" stroke={CHART_COLORS[1]} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Watch history" data={watch?.daily ?? []} filename="watch.csv">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={watch?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                <Line type="monotone" dataKey="watches" stroke={CHART_COLORS[0]} />
                <Line type="monotone" dataKey="viewers" stroke={CHART_COLORS[2]} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Moderation" data={mod?.by_state ?? []} filename="moderation.csv">
            <div className="text-sm text-muted-foreground mb-2">
              {mod?.total_decisions ?? 0} decisions · {mod?.false_positive ?? 0} FP · {mod?.false_negative ?? 0} FN · {mod?.manual_overrides ?? 0} manual · accuracy {mod?.accuracy_pct ?? 0}%
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mod?.by_state ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="state" width={140} fontSize={11} /><Tooltip />
                <Bar dataKey="total" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="AI confidence distribution" data={histo} filename="ai_confidence.csv">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histo}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="bucket" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS[5]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Channel growth & risk" data={growth?.daily ?? []} filename="channels.csv">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={growth?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
                <Bar dataKey="added" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={growth?.risk_distribution ?? []} dataKey="n" nameKey="risk" outerRadius={60} label>
                  {(growth?.risk_distribution ?? []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Category popularity" data={cats} filename="categories.csv">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={cats.slice(0, 12)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="category" width={120} fontSize={11} /><Tooltip /><Legend />
                <Bar dataKey="watches" fill={CHART_COLORS[0]} />
                <Bar dataKey="searches" fill={CHART_COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Engagement" data={engagement?.top_events ?? []} filename="engagement.csv">
            <div className="text-sm text-muted-foreground mb-2">
              {engagement?.active_users ?? 0} active · avg {engagement?.avg_events ?? 0} events · p50 {engagement?.p50 ?? 0} · p90 {engagement?.p90 ?? 0} · p99 {engagement?.p99 ?? 0}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={engagement?.top_events ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="event_name" width={140} fontSize={10} /><Tooltip />
                <Bar dataKey="n" fill={CHART_COLORS[6]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Geographic distribution" data={geo} filename="geo.csv">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={geo.slice(0, 12)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="country" width={80} fontSize={11} /><Tooltip /><Legend />
                <Bar dataKey="sessions" fill={CHART_COLORS[0]} />
                <Bar dataKey="users" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Device / platform" data={[...(device?.device ?? []), ...(device?.platform ?? [])]} filename="device.csv">
            <div className="text-xs font-medium mb-1">Device</div>
            <div className="flex gap-2 flex-wrap mb-3">
              {(device?.device ?? []).map((d) => <Badge key={d.device} variant="outline">{d.device}: {d.n}</Badge>)}
            </div>
            <div className="text-xs font-medium mb-1">Platform</div>
            <div className="flex gap-2 flex-wrap mb-3">
              {(device?.platform ?? []).map((d) => <Badge key={d.platform} variant="outline">{d.platform}: {d.n}</Badge>)}
            </div>
            <div className="text-xs font-medium mb-1">Viewport</div>
            <div className="flex gap-2 flex-wrap">
              {(device?.viewport ?? []).map((d) => <Badge key={d.viewport} variant="outline">{d.viewport}: {d.n}</Badge>)}
            </div>
          </Panel>
        </div>

        <Panel title="Platform performance" data={perf ? [perf as unknown as Record<string, unknown>] : []} filename="performance.csv">
          {perf && perf.samples > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label="Samples" value={perf.samples} />
              <Kpi label="Avg ms" value={perf.avg_ms ?? "—"} />
              <Kpi label="p50 ms" value={perf.p50_ms ?? "—"} />
              <Kpi label="p90 ms" value={perf.p90_ms ?? "—"} />
              <Kpi label="p99 ms" value={perf.p99_ms ?? "—"} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No <code>latency_ms</code> samples in this window. Emit <code>track("perf", {"{ latency_ms }"})</code> from the client to populate.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

// --- small components --------------------------------------------------------

const Kpi = ({ label, value }: { label: string; value: string | number }) => (
  <Card><CardContent className="p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </CardContent></Card>
);

const Panel = ({ title, children, data, filename }: { title: string; children: React.ReactNode; data: unknown[]; filename: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
      <Button size="sm" variant="ghost" onClick={() => downloadCsv(filename, data as Record<string, unknown>[])} disabled={!data?.length}>
        <Download className="h-4 w-4 mr-1" /> CSV
      </Button>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

function groupRetention(rows: RetentionRow[]): Record<string, { size: number } & Record<number, string>> {
  const acc: Record<string, { size: number } & Record<number, string>> = {};
  for (const r of rows) {
    const key = String(r.cohort_week).slice(0, 10);
    if (!acc[key]) acc[key] = { size: r.cohort_size } as { size: number } & Record<number, string>;
    acc[key][r.week_offset] = `${r.retention_pct}%`;
  }
  return acc;
}

export default Analytics;
