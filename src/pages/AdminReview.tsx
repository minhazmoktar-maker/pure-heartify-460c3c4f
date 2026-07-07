import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle2, XCircle, AlertTriangle, Eye, Search } from "lucide-react";

type Candidate = {
  id: string;
  youtube_channel_id: string;
  handle: string | null;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  confidence: number | null;
  duplicate_risk: string | null;
  evidence: Record<string, any>;
  created_at: string;
};

type ApprovedRow = {
  id: string;
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  category: string | null;
  status: string;
  consistency_score: number | null;
  last_rechecked_at: string | null;
};

type AuditRow = {
  id: string;
  candidate_id: string | null;
  channel_ref: string | null;
  youtube_channel_id: string | null;
  action: string;
  confidence: number | null;
  duplicate_risk: string | null;
  evidence: Record<string, any>;
  reason: string | null;
  created_at: string;
};

const AdminReview = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [approved, setApproved] = useState<ApprovedRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [videoCandidates, setVideoCandidates] = useState<Candidate[]>([]);
  const [drawer, setDrawer] = useState<Candidate | AuditRow | null>(null);
  const [newChannelId, setNewChannelId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const reload = async () => {
    const [c, a, l, v] = await Promise.all([
      supabase.from("channel_candidates").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("approved_channels").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("channel_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("video_candidates").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (c.data) setCandidates(c.data as Candidate[]);
    if (a.data) setApproved(a.data as ApprovedRow[]);
    if (l.data) setAudit(l.data as AuditRow[]);
    if (v.data) setVideoCandidates(v.data as unknown as Candidate[]);
  };

  useEffect(() => { if (isAdmin) reload(); }, [isAdmin]);

  const submitForVerification = async () => {
    if (!newChannelId.trim() || !user) return;
    setBusy(true);
    try {
      const ids = newChannelId
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (ids.length === 1) {
        const { data, error } = await supabase.functions.invoke("verify-channel", {
          body: { youtube_channel_id: ids[0], source: "admin_submit" },
        });
        if (error) throw error;
        toast({ title: "Verification complete", description: `Status: ${data?.status} (confidence ${data?.confidence})` });
      } else {
        const { data, error } = await supabase.functions.invoke("batch-verify-channels", {
          body: { channels: ids.map((id) => ({ youtube_channel_id: id, source: "admin_batch" })) },
        });
        if (error) throw error;
        toast({
          title: "Batch verification complete",
          description: `${data?.approved ?? 0} approved · ${data?.pending ?? 0} pending · ${data?.rejected ?? 0} rejected · ${data?.failed ?? 0} failed`,
        });
      }
      setNewChannelId("");
      await reload();
    } catch (e: any) {
      toast({ title: "Verification failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const decide = async (cand: Candidate, action: "approved" | "rejected", reason: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await supabase.from("channel_candidates").update({ status: action }).eq("id", cand.id);

      if (action === "approved") {
        const { data: ownerKey } = await supabase.rpc("compute_owner_key", { _name: cand.handle ?? cand.title });
        await supabase.from("approved_channels").upsert({
          youtube_channel_id: cand.youtube_channel_id,
          title: cand.title, handle: cand.handle, category: cand.category,
          owner_key: (ownerKey as unknown as string) ?? "",
          approved_by: user.id,
          last_rechecked_at: new Date().toISOString(),
          consistency_score: cand.confidence ?? 90,
        }, { onConflict: "youtube_channel_id" });
      }

      await supabase.from("channel_audit_log").insert({
        candidate_id: cand.id,
        youtube_channel_id: cand.youtube_channel_id,
        action, admin_id: user.id,
        confidence: cand.confidence, duplicate_risk: cand.duplicate_risk,
        evidence: cand.evidence, reason,
      });
      toast({ title: action === "approved" ? "Approved" : "Rejected" });
      await reload();
    } catch (e: any) {
      toast({ title: "Failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const runRecheck = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("recheck-approved-channels", { body: {} });
      if (error) throw error;
      toast({ title: "Recheck complete", description: `Processed ${data?.processed ?? 0}` });
      await reload();
    } catch (e: any) {
      toast({ title: "Recheck failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8 text-center">Please <Link className="underline" to="/login">sign in</Link>.</div>
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8 text-center text-destructive">Forbidden — admin access required.</div>
      </div>
    );
  }

  const pending = candidates.filter((c) => c.status === "pending");
  const approvedCands = candidates.filter((c) => c.status === "approved");
  const rejectedCands = candidates.filter((c) => c.status === "rejected");
  const flaggedCh = approved.filter((c) => c.status === "flagged");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Channel & Video Review</h1>
            <p className="text-sm text-muted-foreground">
              {pending.length} pending · {approved.length} approved · {flaggedCh.length} flagged
            </p>
          </div>
          <Button onClick={runRecheck} disabled={busy} variant="outline">
            <AlertTriangle className="mr-2 h-4 w-4" /> Run recheck now
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Submit channel(s) for verification</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="One or more YouTube channel IDs (comma or newline separated)"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
              />
              <Button onClick={submitForVerification} disabled={busy || !newChannelId.trim()}>
                <Search className="mr-2 h-4 w-4" /> Verify
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Single ID uses per-channel verify. Multiple IDs run through the batch verifier.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="compare">Approved vs Rejected</TabsTrigger>
            <TabsTrigger value="flagged">Flagged ({flaggedCh.length})</TabsTrigger>
            <TabsTrigger value="videos">Videos ({videoCandidates.length})</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-2">
            {pending.length === 0 && <p className="text-sm text-muted-foreground p-4">No pending candidates.</p>}
            {pending.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{c.title}</h3>
                      <Badge variant="outline">conf {c.confidence ?? "?"}</Badge>
                      <Badge variant={c.duplicate_risk === "low" ? "outline" : "destructive"}>
                        dup: {c.duplicate_risk ?? "?"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.youtube_channel_id} · {c.category ?? "uncategorized"}</p>
                    {c.evidence?.exclusion_hits?.length > 0 && (
                      <p className="text-xs text-destructive mt-1">Exclusions: {c.evidence.exclusion_hits.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDrawer(c)}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => decide(c, "approved", "Manual approval")} disabled={busy}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => decide(c, "rejected", "Manual rejection")} disabled={busy}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="compare">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base text-green-600">Approved ({approvedCands.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-auto">
                  {approvedCands.map((c) => (
                    <button key={c.id} onClick={() => setDrawer(c)} className="w-full text-left p-2 rounded hover:bg-muted">
                      <div className="font-medium text-sm">{c.title}</div>
                      <div className="text-xs text-muted-foreground">conf {c.confidence} · {c.category}</div>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base text-destructive">Rejected ({rejectedCands.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-auto">
                  {rejectedCands.map((c) => (
                    <button key={c.id} onClick={() => setDrawer(c)} className="w-full text-left p-2 rounded hover:bg-muted">
                      <div className="font-medium text-sm">{c.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.evidence?.exclusion_hits?.length > 0
                          ? `Exclusions: ${c.evidence.exclusion_hits.slice(0, 2).join(", ")}`
                          : c.duplicate_risk === "high" ? "Duplicate" : "Low confidence"}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="flagged" className="space-y-2">
            {flaggedCh.length === 0 && <p className="text-sm text-muted-foreground p-4">No flagged channels.</p>}
            {flaggedCh.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      score {c.consistency_score} · last check {c.last_rechecked_at?.slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline"
                      onClick={async () => {
                        await supabase.from("approved_channels").update({ status: "active" }).eq("id", c.id);
                        reload();
                      }}>
                      Keep
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={async () => {
                        await supabase.from("approved_channels").update({ status: "removed" }).eq("id", c.id);
                        await supabase.from("channel_audit_log").insert({
                          channel_ref: c.id, youtube_channel_id: c.youtube_channel_id,
                          action: "removed", admin_id: user.id, reason: "manual removal after flag",
                          evidence: { removed_from: "flagged_review" },
                        });
                        reload();
                      }}>
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="videos" className="space-y-2">
            {videoCandidates.length === 0 && <p className="text-sm text-muted-foreground p-4">No video candidates.</p>}
            {videoCandidates.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{v.title}</div>
                    <div className="text-xs text-muted-foreground">{v.youtube_channel_id} · {v.status}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDrawer(v)}><Eye className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="audit" className="space-y-2 max-h-[600px] overflow-auto">
            {audit.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm p-2 border-b">
                <div>
                  <Badge variant={r.action === "approved" ? "default" : r.action === "rejected" ? "destructive" : "outline"}>
                    {r.action}
                  </Badge>{" "}
                  <span className="font-mono text-xs">{r.youtube_channel_id}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  conf {r.confidence ?? "-"} · {r.created_at.slice(0, 16).replace("T", " ")}
                  <Button size="sm" variant="ghost" onClick={() => setDrawer(r)}><Eye className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-auto">
          <SheetHeader><SheetTitle>Evidence & decision trace</SheetTitle></SheetHeader>
          {drawer && (
            <pre className="mt-4 text-xs bg-muted p-3 rounded overflow-auto whitespace-pre-wrap">
              {JSON.stringify(drawer, null, 2)}
            </pre>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminReview;
