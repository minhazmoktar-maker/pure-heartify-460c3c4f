import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";
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
type Sitemap = { path: string; lastSubmitted?: string; isPending?: boolean; errors?: number; warnings?: number; contents?: unknown[] };

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
  const [busy, setBusy] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [inspectUrl, setInspectUrl] = useState(DEFAULT_SITE);
  const [inspectResult, setInspectResult] = useState<unknown>(null);

  const refreshStatus = useCallback(async () => {
    setBusy("status");
    try {
      const s = await call<Status>("status");
      setStatus(s);
    } catch (e) {
      toast({ title: "Status failed", description: (e as Error).message, variant: "destructive" });
      setStatus({ configured: false, error: (e as Error).message });
    } finally { setBusy(null); }
  }, []);

  const refreshSitemaps = useCallback(async () => {
    setBusy("sitemaps");
    try {
      const r = await call<{ sitemap: Sitemap[] }>("list_sitemaps", { siteUrl: site });
      setSitemaps(r.sitemap || []);
    } catch (e) {
      toast({ title: "Sitemap list failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  }, [site]);

  const refreshPerf = useCallback(async () => {
    setBusy("perf");
    try {
      const p = await call<Perf>("performance", { siteUrl: site, days: 28 });
      setPerf(p);
    } catch (e) {
      toast({ title: "Performance failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  }, [site]);

  useEffect(() => { if (isOwner) refreshStatus(); }, [isOwner, refreshStatus]);

  const isVerified = !!status?.sites?.some(s => s.siteUrl === site);

  const submitSitemap = async () => {
    setBusy("submit");
    try {
      const r = await call<{ ok: boolean; status: number; data: unknown }>("submit_sitemap", { siteUrl: site, feedpath: `${site}${SITEMAP}` });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
      toast({ title: "Sitemap submitted", description: `${site}${SITEMAP}` });
      await refreshSitemaps();
    } catch (e) {
      toast({ title: "Submit failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const getVerifyToken = async () => {
    setBusy("token");
    try {
      const r = await call<{ token?: string; ok: boolean }>("verify_meta", { site });
      if (!r.token) throw new Error("no token returned");
      setVerifyToken(r.token);
      toast({ title: "Verification token issued", description: "Ensure it's deployed in index.html, then click Verify." });
    } catch (e) {
      toast({ title: "Token request failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const verifySite = async () => {
    setBusy("verify");
    try {
      const r = await call<{ ok: boolean; status: number; data: unknown }>("verify_site", { site });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.data)}`);
      toast({ title: "Verified!", description: site });
      await Promise.all([refreshStatus(), addProperty()]);
    } catch (e) {
      toast({ title: "Verify failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const addProperty = async () => {
    try { await call("add_site", { site }); } catch { /* already added is fine */ }
  };

  const runInspect = async () => {
    setBusy("inspect");
    try {
      const r = await call<{ ok: boolean; status: number; data: unknown }>("inspect_url", { siteUrl: site, inspectionUrl: inspectUrl });
      setInspectResult(r.data);
    } catch (e) {
      toast({ title: "Inspect failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Google Search Console · Heartify" description="Manage Google Search Console verification, sitemaps, and indexing metrics." path="/admin/gsc" />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="flex items-center gap-3">
          <Search className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Google Search Console</h1>
            <p className="text-sm text-muted-foreground">Connection state, verification, sitemap submission, and indexing metrics.</p>
          </div>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Connection status</CardTitle>
            <Button size="sm" variant="outline" onClick={refreshStatus} disabled={busy === "status"}>
              {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Connector:</span>
              {status?.configured
                ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Configured</Badge>
                : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Not configured</Badge>}
              <span className="text-muted-foreground ml-4">Reachable:</span>
              {status?.reachable
                ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />OK ({status.status})</Badge>
                : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{status?.status ?? "—"}</Badge>}
              {status?.checkedAt && (
                <span className="text-xs text-muted-foreground ml-auto">Last sync: {new Date(status.checkedAt).toLocaleString()}</span>
              )}
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
                  <li className="text-xs text-muted-foreground">No verified properties yet — use the Verification tab below.</li>
                )}
              </ul>
            </div>
            {status?.error != null && (
              <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(status.error, null, 2)}</pre>
            )}
          </CardContent>
        </Card>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Site URL (with trailing slash)</label>
            <Input value={site} onChange={e => setSite(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>

        <Tabs defaultValue="verify">
          <TabsList>
            <TabsTrigger value="verify">Verification</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
            <TabsTrigger value="perf">Performance</TabsTrigger>
            <TabsTrigger value="inspect">URL Inspector</TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Domain ownership</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  {isVerified
                    ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Verified for this workspace</Badge>
                    : <Badge variant="secondary">Not yet verified in this workspace</Badge>}
                </div>
                <ol className="list-decimal ml-5 space-y-2 text-sm text-muted-foreground">
                  <li>Click <b>Get verification token</b>. Confirm the returned meta tag matches the one already in <code>index.html</code>.</li>
                  <li>If the tag differs, replace it and republish, then continue.</li>
                  <li>Click <b>Verify</b>. Google fetches the live page and confirms ownership.</li>
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

          <TabsContent value="sitemap" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Sitemaps</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={refreshSitemaps} disabled={!!busy}>Refresh</Button>
                  <Button size="sm" onClick={submitSitemap} disabled={!!busy}>Submit sitemap.xml</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {sitemaps.length === 0 && <p className="text-muted-foreground">No sitemaps submitted yet.</p>}
                {sitemaps.map(sm => (
                  <div key={sm.path} className="rounded border p-2">
                    <div className="flex items-center gap-2">
                      <a href={sm.path} target="_blank" rel="noreferrer" className="font-mono text-xs hover:underline flex items-center gap-1">
                        {sm.path} <ExternalLink className="h-3 w-3" />
                      </a>
                      {sm.isPending && <Badge variant="secondary">pending</Badge>}
                      {sm.errors ? <Badge variant="destructive">{sm.errors} errors</Badge> : null}
                      {sm.warnings ? <Badge variant="outline">{sm.warnings} warnings</Badge> : null}
                    </div>
                    {sm.lastSubmitted && <div className="text-xs text-muted-foreground">Last submitted: {new Date(sm.lastSubmitted).toLocaleString()}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
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
                {!perf && <p className="text-muted-foreground">Click Sync to fetch metrics from Google.</p>}
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
