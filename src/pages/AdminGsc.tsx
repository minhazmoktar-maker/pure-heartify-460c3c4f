import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, Search, CheckCircle2, XCircle, RefreshCw, ExternalLink,
  AlertTriangle, Radio, Clock, Play, Plus, Minus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DEFAULT_SITE = "https://pure-heartify.lovable.app/";
const SITEMAP = "sitemap.xml";

type Status = {
  configured: boolean;
  reachable?: boolean;
  status?: number;
  sites?: Array<{ siteUrl: string; permissionLevel: string }>;
  error?: unknown;
  checkedAt?: string;
};
type Perf = {
  ok: boolean;
  days: number;
  totals: { clicks: number; impressions: number };
  rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
  topQueries: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
  error?: unknown;
};
type Sitemap = { path: string; lastSubmitted?: string; isPending?: boolean; errors?: number | string; warnings?: number | string; contents?: unknown[] };
type Validation = {
  ok: boolean;
  sitemapUrl: string;
  fetchStatus: number;
  urlCount: number;
  urls: string[];
  problems: string[];
  googleSitemaps: Sitemap[];
};
type SnapshotRow = {
  id: string;
  kind: string;
  site_url: string | null;
  data: Record<string, unknown>;
  ok: boolean;
  error: string | null;
  created_at: string;
};

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("gsc", { body: { action, ...params } });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export default function AdminGsc() {
  const { loading, isOwner } = useRole();
  const [site, setSite] = useState(DEFAULT_SITE);
  const [status, setStatus] = useState<Status | null>(null);
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [inspectUrl, setInspectUrl] = useState(DEFAULT_SITE);
  const [inspectResult, setInspectResult] = useState<unknown>(null);

  // Latest scheduled-sync snapshot per kind (status/sitemaps/performance)
  const [snapshots, setSnapshots] = useState<Record<string, SnapshotRow>>({});
  const [alerts, setAlerts] = useState<Array<{ id: string; level: "error" | "warn" | "info"; text: string; at: string }>>([]);

  const pushAlert = useCallback((level: "error" | "warn" | "info", text: string) => {
    setAlerts(prev => [{ id: crypto.randomUUID(), level, text, at: new Date().toISOString() }, ...prev].slice(0, 20));
  }, []);

  const refreshStatus = useCallback(async () => {
    setBusy("status");
    try {
      const s = await call<Status>("status");
      setStatus(s);
      if (!s.configured) pushAlert("error", "Connector not configured");
      else if (!s.reachable) pushAlert("error", `GSC unreachable (HTTP ${s.status})`);
    } catch (e) {
      pushAlert("error", `Status: ${(e as Error).message}`);
      setStatus({ configured: false, error: (e as Error).message });
    } finally { setBusy(null); }
  }, [pushAlert]);

  const refreshSitemaps = useCallback(async () => {
    setBusy("sitemaps");
    try {
      const r = await call<{ sitemap: Sitemap[] }>("list_sitemaps", { siteUrl: site });
      setSitemaps(r.sitemap || []);
    } catch (e) {
      pushAlert("error", `Sitemap list: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }, [site, pushAlert]);

  const refreshPerf = useCallback(async () => {
    setBusy("perf");
    try {
      const p = await call<Perf>("performance", { siteUrl: site, days: 28 });
      setPerf(p);
    } catch (e) {
      pushAlert("error", `Performance: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }, [site, pushAlert]);

  const validateSitemap = useCallback(async () => {
    setBusy("validate");
    try {
      const v = await call<Validation>("validate_sitemap", { siteUrl: site });
      setValidation(v);
      if (!v.ok) pushAlert("warn", `Sitemap validation found ${v.problems.length} issue(s)`);
      else pushAlert("info", `Sitemap OK — ${v.urlCount} URLs`);
    } catch (e) {
      pushAlert("error", `Validate: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }, [site, pushAlert]);

  // Load latest snapshots and subscribe to inserts
  useEffect(() => {
    if (!isOwner) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("gsc_sync_snapshots" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!mounted || !data) return;
      const latest: Record<string, SnapshotRow> = {};
      for (const row of data as SnapshotRow[]) {
        if (!latest[row.kind]) latest[row.kind] = row;
      }
      setSnapshots(latest);
    })();

    const ch = supabase
      .channel("gsc-snapshots")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gsc_sync_snapshots" },
        (payload) => {
          const row = payload.new as SnapshotRow;
          setSnapshots(prev => ({ ...prev, [row.kind]: row }));
          if (!row.ok) pushAlert("error", `Scheduled ${row.kind} sync failed: ${row.error ?? "unknown"}`);
          else pushAlert("info", `Scheduled ${row.kind} sync succeeded`);
          // Auto-refresh matching view
          if (row.kind === "status") refreshStatus();
          if (row.kind === "sitemaps") setSitemaps((row.data as { sitemap?: Sitemap[] })?.sitemap ?? []);
          if (row.kind === "performance") {
            const d = row.data as { totals?: Perf["totals"]; rows?: Perf["rows"]; topQueries?: Perf["topQueries"]; days?: number };
            setPerf({ ok: true, days: d.days ?? 28, totals: d.totals ?? { clicks: 0, impressions: 0 }, rows: d.rows ?? [], topQueries: d.topQueries ?? [] });
          }
        },
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [isOwner, pushAlert, refreshStatus]);

  useEffect(() => { if (isOwner) refreshStatus(); }, [isOwner, refreshStatus]);

  const isVerified = !!status?.sites?.some(s => s.siteUrl === site);
  const lastSyncByKind = useMemo(() => ({
    status: snapshots.status?.created_at,
    sitemaps: snapshots.sitemaps?.created_at,
    performance: snapshots.performance?.created_at,
  }), [snapshots]);

  const submitSitemap = async () => {
    setBusy("submit");
    try {
      const r = await call<{ ok: boolean; status: number; data: unknown }>("submit_sitemap", { siteUrl: site, feedpath: `${site}${SITEMAP}` });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
      pushAlert("info", "Sitemap submitted to Google");
      toast({ title: "Sitemap submitted", description: `${site}${SITEMAP}` });
      await Promise.all([refreshSitemaps(), validateSitemap()]);
    } catch (e) {
      pushAlert("error", `Submit failed: ${(e as Error).message}`);
      toast({ title: "Submit failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const getVerifyToken = async () => {
    setBusy("token");
    try {
      const r = await call<{ token?: string; ok: boolean }>("verify_meta", { site });
      if (!r.token) throw new Error("no token returned");
      setVerifyToken(r.token);
      toast({ title: "Verification token issued" });
    } catch (e) {
      pushAlert("error", `Token: ${(e as Error).message}`);
    } finally { setBusy(null); }
  };

  const verifySite = async () => {
    setBusy("verify");
    try {
      const r = await call<{ ok: boolean; status: number; data: unknown }>("verify_site", { site });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
      pushAlert("info", `Verified: ${site}`);
      toast({ title: "Verified!", description: site });
      try { await call("add_site", { site }); } catch { /* ignore already-added */ }
      await refreshStatus();
    } catch (e) {
      pushAlert("error", `Verify failed: ${(e as Error).message}`);
      toast({ title: "Verify failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const runInspect = async () => {
    setBusy("inspect");
    try {
      const r = await call<{ ok: boolean; status: number; data: unknown }>("inspect_url", { siteUrl: site, inspectionUrl: inspectUrl });
      setInspectResult(r.data);
    } catch (e) {
      pushAlert("error", `Inspect: ${(e as Error).message}`);
    } finally { setBusy(null); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isOwner) return <Navigate to="/" replace />;

  const criticalAlerts = alerts.filter(a => a.level === "error");

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Google Search Console · Heartify" description="Manage GSC verification, sitemaps, and indexing metrics." path="/admin/gsc" />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="flex items-center gap-3">
          <Search className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Google Search Console</h1>
            <p className="text-sm text-muted-foreground">Live connector state, verification, sitemap validation, indexing metrics — synced automatically every hour.</p>
          </div>
        </header>

        {criticalAlerts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Active issues ({criticalAlerts.length})</AlertTitle>
            <AlertDescription>
              <ul className="list-disc ml-5 space-y-1 text-sm">
                {criticalAlerts.slice(0, 5).map(a => (
                  <li key={a.id}><span className="text-xs opacity-70">{new Date(a.at).toLocaleTimeString()}</span> — {a.text}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4 text-primary" />Connection status</CardTitle>
            <Button size="sm" variant="outline" onClick={refreshStatus} disabled={busy === "status"}>
              {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {status?.configured
                ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Configured</Badge>
                : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Not configured</Badge>}
              {status?.reachable
                ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Reachable ({status.status})</Badge>
                : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{status?.status ?? "unreachable"}</Badge>}
              <div className="ml-auto text-xs text-muted-foreground grid grid-cols-3 gap-3">
                <span>Status sync: {lastSyncByKind.status ? new Date(lastSyncByKind.status).toLocaleTimeString() : "—"}</span>
                <span>Sitemap sync: {lastSyncByKind.sitemaps ? new Date(lastSyncByKind.sitemaps).toLocaleTimeString() : "—"}</span>
                <span>Perf sync: {lastSyncByKind.performance ? new Date(lastSyncByKind.performance).toLocaleTimeString() : "—"}</span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Verified properties ({status?.sites?.length ?? 0}):</span>
              <ul className="mt-1 space-y-1">
                {(status?.sites ?? []).map(s => (
                  <li key={s.siteUrl} className="flex items-center gap-2 font-mono text-xs">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {s.siteUrl} <Badge variant="outline">{s.permissionLevel}</Badge>
                  </li>
                ))}
                {(!status?.sites || status.sites.length === 0) && (
                  <li className="text-xs text-muted-foreground">No verified properties — use Verification tab.</li>
                )}
              </ul>
            </div>
            {status?.error != null && Boolean(status.error) && (
              <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(status.error, null, 2)}</pre>
            )}
          </CardContent>
        </Card>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Site URL (trailing slash required)</label>
            <Input value={site} onChange={e => setSite(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>

        <Tabs defaultValue="verify">
          <TabsList>
            <TabsTrigger value="verify">Verification</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
            <TabsTrigger value="perf">Performance</TabsTrigger>
            <TabsTrigger value="inspect">URL Inspector</TabsTrigger>
            <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Domain ownership</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  {isVerified
                    ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Verified for this workspace</Badge>
                    : <Badge variant="secondary">Not yet verified</Badge>}
                </div>
                <ol className="list-decimal ml-5 space-y-2 text-sm text-muted-foreground">
                  <li><b>Get token</b> — confirm it matches the meta tag in <code>index.html</code>.</li>
                  <li>If it differs, replace it and republish.</li>
                  <li>Click <b>Verify with Google</b> once the site is live.</li>
                </ol>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={getVerifyToken} disabled={!!busy}>
                    {busy === "token" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get verification token"}
                  </Button>
                  <Button onClick={verifySite} disabled={!!busy}>
                    {busy === "verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify with Google"}
                  </Button>
                </div>
                {verifyToken && (
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">{`<meta name="google-site-verification" content="${verifyToken.replace(/^google-site-verification=/, "")}" />`}</pre>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sitemap" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Sitemaps</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={refreshSitemaps} disabled={!!busy}>Refresh</Button>
                  <Button size="sm" variant="outline" onClick={validateSitemap} disabled={!!busy}>
                    {busy === "validate" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
                  </Button>
                  <Button size="sm" onClick={submitSitemap} disabled={!!busy}>Submit sitemap.xml</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {sitemaps.length === 0 && <p className="text-muted-foreground">No sitemaps submitted yet.</p>}
                {sitemaps.map(sm => (
                  <div key={sm.path} className="rounded border p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={sm.path} target="_blank" rel="noreferrer" className="font-mono text-xs hover:underline flex items-center gap-1">
                        {sm.path} <ExternalLink className="h-3 w-3" />
                      </a>
                      {sm.isPending && <Badge variant="secondary">pending</Badge>}
                      {Number(sm.errors ?? 0) > 0 && <Badge variant="destructive">{sm.errors} errors</Badge>}
                      {Number(sm.warnings ?? 0) > 0 && <Badge variant="outline">{sm.warnings} warnings</Badge>}
                    </div>
                    {sm.lastSubmitted && <div className="text-xs text-muted-foreground">Last submitted: {new Date(sm.lastSubmitted).toLocaleString()}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {validation && (
              <Card>
                <CardHeader><CardTitle className="text-base">Validation report</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {validation.ok
                      ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Valid</Badge>
                      : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{validation.problems.length} issue(s)</Badge>}
                    <Badge variant="outline">HTTP {validation.fetchStatus}</Badge>
                    <Badge variant="outline">{validation.urlCount} URLs</Badge>
                  </div>
                  {validation.problems.length > 0 && (
                    <ul className="list-disc ml-5 text-xs text-destructive space-y-1">
                      {validation.problems.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  )}
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground">Show URLs</summary>
                    <ul className="mt-2 max-h-64 overflow-auto rounded border p-2 space-y-1">
                      {validation.urls.map(u => <li key={u} className="font-mono text-xs truncate">{u}</li>)}
                    </ul>
                  </details>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="perf" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Search performance (last 28 days)</CardTitle>
                <Button size="sm" variant="outline" onClick={refreshPerf} disabled={!!busy}>
                  {busy === "perf" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync now"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {!perf && <p className="text-muted-foreground">Waiting for first sync…</p>}
                {perf && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Stat label="Clicks" value={perf.totals.clicks.toLocaleString()} />
                      <Stat label="Impressions" value={perf.totals.impressions.toLocaleString()} />
                      <Stat label="CTR" value={perf.totals.impressions ? `${((perf.totals.clicks / perf.totals.impressions) * 100).toFixed(2)}%` : "—"} />
                      <Stat label="Days" value={String(perf.days)} />
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Top queries</h3>
                      <div className="rounded border overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40 text-left">
                            <tr><th className="px-2 py-1">Query</th><th className="px-2 py-1">Clicks</th><th className="px-2 py-1">Impr.</th><th className="px-2 py-1">CTR</th><th className="px-2 py-1">Pos.</th></tr>
                          </thead>
                          <tbody>
                            {perf.topQueries.map((r, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-2 py-1">{r.keys[0]}</td>
                                <td className="px-2 py-1">{r.clicks}</td>
                                <td className="px-2 py-1">{r.impressions}</td>
                                <td className="px-2 py-1">{(r.ctr * 100).toFixed(2)}%</td>
                                <td className="px-2 py-1">{r.position.toFixed(1)}</td>
                              </tr>
                            ))}
                            {perf.topQueries.length === 0 && <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No data yet.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspect" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">URL inspection</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <Input value={inspectUrl} onChange={e => setInspectUrl(e.target.value)} className="font-mono text-xs" />
                  <Button onClick={runInspect} disabled={!!busy}>Inspect</Button>
                </div>
                {inspectResult != null && (
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-96">{JSON.stringify(inspectResult, null, 2)}</pre>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Live alerts</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setAlerts([])}>Clear</Button>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 && <p className="text-sm text-muted-foreground">No events yet — background sync will populate this feed.</p>}
                <ul className="space-y-1">
                  {alerts.map(a => (
                    <li key={a.id} className="flex items-start gap-2 text-sm rounded border p-2">
                      <Badge variant={a.level === "error" ? "destructive" : a.level === "warn" ? "outline" : "secondary"}>{a.level}</Badge>
                      <span className="flex-1">{a.text}</span>
                      <span className="text-xs text-muted-foreground">{new Date(a.at).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
