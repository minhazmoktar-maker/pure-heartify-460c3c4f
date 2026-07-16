import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";
import { Loader2, PlayCircle, ShieldCheck, ShieldAlert, ExternalLink, Sparkles, Layers } from "lucide-react";

type Tier = "A" | "B" | "C" | "D";

type Candidate = {
  id: string;
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  description: string | null;
  subscriber_count: number | null;
  language_detected: string | null;
  category: string | null;
  status: string;
  tier: Tier | null;
  tier_reason: string[] | null;
  risk_score: number | null;
  confidence: number | null;
  duplicate_risk: string | null;
  cluster_id: string | null;
  moderation_summary: Record<string, unknown> | null;
  auto_action: string | null;
  created_at: string;
};

type Cluster = {
  id: string;
  cluster_key: string;
  label: string;
  language: string | null;
  primary_topic: string | null;
  organization_type: string | null;
  candidate_count: number;
  dominant_tier: Tier | null;
};

const TIER_LABEL: Record<Tier, string> = {
  A: "A · Auto-approve",
  B: "B · Fast review",
  C: "C · Full review",
  D: "D · Rejected / quarantine",
};

const TIER_VARIANT: Record<Tier, "default" | "secondary" | "outline" | "destructive"> = {
  A: "default",
  B: "secondary",
  C: "outline",
  D: "destructive",
};

const AdminChannelPipeline = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const [tier, setTier] = useState<Tier>("B");
  const [rows, setRows] = useState<Candidate[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [classifying, setClassifying] = useState(false);

  const load = async () => {
    setLoading(true);
    setSelected(new Set());
    const statusFilter = tier === "A" ? "approved" : tier === "D" ? "rejected" : "pending";
    const { data, error } = await supabase
      .from("channel_candidates")
      .select("id, youtube_channel_id, title, handle, description, subscriber_count, language_detected, category, status, tier, tier_reason, risk_score, confidence, duplicate_risk, cluster_id, moderation_summary, auto_action, created_at")
      .eq("tier", tier)
      .eq("status", statusFilter)
      .order("risk_score", { ascending: tier !== "D" })
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Candidate[]);
    const { data: cl } = await supabase
      .from("moderation_clusters")
      .select("id, cluster_key, label, language, primary_topic, organization_type, candidate_count, dominant_tier")
      .order("candidate_count", { ascending: false })
      .limit(100);
    setClusters((cl ?? []) as Cluster[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) load();
  }, [roleLoading, isAdmin, tier]);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const bulk = async (action: "approve" | "reject" | "escalate" | "revert", opts: { ids?: string[]; cluster_id?: string } = {}) => {
    const body: Record<string, unknown> = { action };
    if (opts.cluster_id) body.cluster_id = opts.cluster_id;
    else body.ids = opts.ids ?? Array.from(selected);
    if ((!body.ids || (body.ids as string[]).length === 0) && !opts.cluster_id) {
      toast({ title: "Nothing selected", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("bulk-moderate-candidates", { body });
    setBusy(false);
    if (error) {
      toast({ title: "Bulk action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Bulk ${action} complete`, description: JSON.stringify(data).slice(0, 200) });
    await load();
  };

  const runClassifier = async (dryRun: boolean) => {
    setClassifying(true);
    const { data, error } = await supabase.functions.invoke("batch-classify-candidates", {
      body: { dry_run: dryRun, limit: 100 },
    });
    setClassifying(false);
    if (error) {
      toast({ title: "Classifier failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: dryRun ? "Dry-run classified" : "Classified & auto-acted", description: `${JSON.stringify((data as any)?.stats ?? {})}` });
    await load();
  };

  const counts = useMemo(() => ({
    selected: selected.size,
    total: rows.length,
  }), [selected, rows]);

  if (roleLoading) return <div className="min-h-screen"><Navbar /><div className="p-8"><Loader2 className="animate-spin" /></div></div>;
  if (!isAdmin) return <div className="min-h-screen"><Navbar /><div className="p-8">Admin only.</div></div>;

  return (
    <div className="min-h-screen">
      <SEO title="Channel Moderation Pipeline · Admin" description="Confidence-tiered channel moderation" />
      <Navbar />
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Channel moderation pipeline</h1>
            <p className="text-sm text-muted-foreground">Tiered review · halal-first · every decision reversible.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => runClassifier(true)} disabled={classifying}>
              {classifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-1">Dry-run classify</span>
            </Button>
            <Button size="sm" onClick={() => runClassifier(false)} disabled={classifying}>
              <PlayCircle className="h-4 w-4" /><span className="ml-1">Classify & auto-act</span>
            </Button>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/discovery">Discovery →</Link></Button>
          </div>
        </header>

        <Tabs value={tier} onValueChange={(v) => setTier(v as Tier)}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            {(["A","B","C","D"] as Tier[]).map((t) => (
              <TabsTrigger key={t} value={t}>{TIER_LABEL[t]}</TabsTrigger>
            ))}
          </TabsList>

          {(["A","B","C","D"] as Tier[]).map((t) => (
            <TabsContent key={t} value={t} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {t === "A" && <ShieldCheck className="h-4 w-4 text-green-600" />}
                    {t === "D" && <ShieldAlert className="h-4 w-4 text-red-600" />}
                    {TIER_LABEL[t]} · {counts.total} rows · {counts.selected} selected
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={toggleAll} disabled={rows.length === 0}>
                      {selected.size === rows.length && rows.length > 0 ? "Unselect all" : "Select all"}
                    </Button>
                    {t !== "A" && <Button size="sm" onClick={() => bulk("approve")} disabled={busy || counts.selected === 0}>Approve {counts.selected}</Button>}
                    {t !== "D" && <Button size="sm" variant="destructive" onClick={() => bulk("reject")} disabled={busy || counts.selected === 0}>Reject {counts.selected}</Button>}
                    {t === "B" && <Button size="sm" variant="secondary" onClick={() => bulk("escalate")} disabled={busy || counts.selected === 0}>Escalate to full review</Button>}
                    {t === "A" && <Button size="sm" variant="destructive" onClick={() => bulk("revert")} disabled={busy || counts.selected === 0}>Revert auto-approval</Button>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading ? <Loader2 className="animate-spin" /> :
                    rows.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No rows in Tier {t}.</p> :
                    rows.map((r) => {
                      const summary = r.moderation_summary as any;
                      return (
                        <div key={r.id} className="flex items-start gap-3 rounded-md border p-3">
                          <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a href={`https://www.youtube.com/channel/${r.youtube_channel_id}`} target="_blank" rel="noreferrer" className="font-medium hover:underline flex items-center gap-1">
                                {r.title} <ExternalLink className="h-3 w-3" />
                              </a>
                              {r.tier && <Badge variant={TIER_VARIANT[r.tier]}>Tier {r.tier}</Badge>}
                              {typeof r.confidence === "number" && <Badge variant="outline">conf {r.confidence}</Badge>}
                              {typeof r.risk_score === "number" && <Badge variant="outline">risk {r.risk_score}</Badge>}
                              {r.duplicate_risk && <Badge variant={r.duplicate_risk === "high" ? "destructive" : "outline"}>dup {r.duplicate_risk}</Badge>}
                              {r.language_detected && <Badge variant="outline">{r.language_detected}</Badge>}
                              {r.subscriber_count != null && <Badge variant="outline">{Intl.NumberFormat().format(r.subscriber_count)} subs</Badge>}
                            </div>
                            {r.tier_reason && r.tier_reason.length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground truncate">{r.tier_reason.join(" · ")}</p>
                            )}
                            {summary && (
                              <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                                {summary.presenter_analysis && <div><span className="font-medium">Presenter:</span> {String(summary.presenter_analysis)}</div>}
                                {summary.music_analysis && <div><span className="font-medium">Music:</span> {String(summary.music_analysis)}</div>}
                                {Array.isArray(summary.halal_flags) && summary.halal_flags.length > 0 && <div className="text-red-600"><span className="font-medium">Halal flags:</span> {summary.halal_flags.join(", ")}</div>}
                                {summary.rationale && <div className="sm:col-span-2"><span className="font-medium">Rationale:</span> {String(summary.rationale)}</div>}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            {t !== "A" && <Button size="sm" onClick={() => bulk("approve", { ids: [r.id] })} disabled={busy}>Approve</Button>}
                            {t !== "D" && <Button size="sm" variant="destructive" onClick={() => bulk("reject", { ids: [r.id] })} disabled={busy}>Reject</Button>}
                            {t === "A" && <Button size="sm" variant="destructive" onClick={() => bulk("revert", { ids: [r.id] })} disabled={busy}>Revert</Button>}
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Clusters · one-click on similar channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {clusters.length === 0 ? <p className="text-sm text-muted-foreground">No clusters yet — run the classifier.</p> :
              clusters.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.candidate_count} candidates · {c.organization_type ?? "n/a"} · {c.language ?? "und"}{c.dominant_tier ? ` · Tier ${c.dominant_tier}` : ""}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => bulk("approve", { cluster_id: c.id })} disabled={busy}>Approve all similar</Button>
                    <Button size="sm" variant="destructive" onClick={() => bulk("reject", { cluster_id: c.id })} disabled={busy}>Reject all similar</Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminChannelPipeline;
