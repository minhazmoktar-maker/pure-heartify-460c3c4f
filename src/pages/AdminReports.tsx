/**
 * Admin community-reports queue.
 *
 * Design principles:
 *  - Reports never auto-remove content. Every action is a moderator decision.
 *  - Every action writes a `report_moderation_actions` audit row.
 *  - Report status is grouped by tab so the open queue is always front-and-center.
 *  - The screen integrates with existing moderation primitives:
 *      * removed_videos    (soft remove from platform)
 *      * approved_channels (status = 'banned' for a channel ban)
 *      * curated_videos    (halal_score adjustment)
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldAlert, MessageSquare, Ban, Trash2, ArrowDownRight, ArrowUpRight, X, Check, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import SEO from "@/components/SEO";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ReportRow = {
  id: string;
  user_id: string | null;
  video_id: string | null;
  channel_id: string | null;
  video_title: string | null;
  channel_title: string | null;
  reason: string;
  details: string | null;
  severity: string;
  status: string;
  resolution: string | null;
  moderator_id: string | null;
  moderator_notes: string | null;
  notify_reporter: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type ActionRow = {
  id: string;
  action: string;
  notes: string | null;
  created_at: string;
  moderator_id: string;
  metadata: Record<string, unknown>;
};

const STATUS_TABS: { value: string; label: string; matcher: (r: ReportRow) => boolean }[] = [
  { value: "open",          label: "Open",          matcher: (r) => r.status === "open" },
  { value: "investigating", label: "Investigating", matcher: (r) => r.status === "investigating" },
  { value: "resolved",      label: "Resolved",      matcher: (r) => r.status.startsWith("resolved_") },
  { value: "dismissed",     label: "Dismissed",     matcher: (r) => r.status.startsWith("dismissed_") },
];

const REASON_LABEL: Record<string, string> = {
  inappropriate_content: "Inappropriate",
  music_or_haram: "Music / haram",
  misinformation: "Misinformation",
  sexual_content: "Sexual content",
  violence: "Violence",
  hate_speech: "Hate speech",
  copyright: "Copyright",
  spam: "Spam",
  wrong_metadata: "Wrong metadata",
  broken_video: "Broken video",
  other: "Other",
};

function severityColor(s: string) {
  if (s === "critical") return "bg-destructive text-destructive-foreground";
  if (s === "high") return "bg-orange-500/90 text-white";
  if (s === "low") return "bg-muted text-muted-foreground";
  return "bg-secondary text-secondary-foreground";
}

export default function AdminReports({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "remove" | "ban"; report: ReportRow }>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data as ReportRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) { setActions([]); return; }
    supabase.from("report_moderation_actions")
      .select("*")
      .eq("report_id", selected.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setActions((data as ActionRow[]) ?? []));
  }, [selected]);

  const grouped = useMemo(() => {
    const g: Record<string, ReportRow[]> = { open: [], investigating: [], resolved: [], dismissed: [] };
    for (const r of rows) {
      const t = STATUS_TABS.find((s) => s.matcher(r));
      if (t) g[t.value].push(r);
    }
    return g;
  }, [rows]);

  const recordAction = async (
    report: ReportRow,
    action: string,
    updates: Partial<ReportRow>,
    metadata: Record<string, unknown> = {},
  ) => {
    if (!user) return;
    setBusy(action);
    try {
      const { error: upErr } = await supabase
        .from("video_reports")
        .update({
          ...updates,
          moderator_id: user.id,
          moderator_notes: note.trim() || report.moderator_notes,
          resolved_at: updates.status && updates.status !== "investigating" ? new Date().toISOString() : report.resolved_at,
        })
        .eq("id", report.id);
      if (upErr) throw upErr;

      const { error: actErr } = await supabase.from("report_moderation_actions").insert([{
        report_id: report.id,
        moderator_id: user.id,
        action,
        notes: note.trim() || null,
        metadata: metadata as never,
      }]);

      if (actErr) throw actErr;

      toast.success(`Recorded: ${action.replace(/_/g, " ")}`);
      setNote("");
      setSelected(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update report");
    } finally {
      setBusy(null);
    }
  };

  const removeVideo = async (report: ReportRow) => {
    if (!report.video_id) { toast.error("No video attached to this report"); return; }
    const { error } = await supabase.from("removed_videos").insert({
      video_id: report.video_id,
      reason: `Report ${report.id}: ${REASON_LABEL[report.reason] ?? report.reason}`,
      removed_by: user!.id,
    });
    if (error && !error.message.includes("duplicate")) throw error;
    await supabase.from("curated_videos").delete().eq("video_id", report.video_id);
    await recordAction(report, "remove_video",
      { status: "resolved_content_removed", resolution: "video_removed" },
      { video_id: report.video_id });
  };

  const banChannel = async (report: ReportRow) => {
    if (!report.channel_id && !report.channel_title) {
      toast.error("No channel information on this report"); return;
    }
    if (report.channel_id) {
      await supabase.from("approved_channels")
        .update({ status: "banned" })
        .eq("youtube_channel_id", report.channel_id);
    }
    if (report.channel_title) {
      await supabase.from("blocked_creators").insert({
        pattern: report.channel_title, reason: `Report ${report.id}`,
      }).then(() => {}, () => {});
    }
    await recordAction(report, "ban_channel",
      { status: "resolved_channel_banned", resolution: "channel_banned" },
      { channel_id: report.channel_id, channel_title: report.channel_title });
  };

  const adjustScore = async (report: ReportRow, delta: number) => {
    if (!report.video_id) { toast.error("No video attached"); return; }
    const { data: cv } = await supabase.from("curated_videos")
      .select("halal_score").eq("video_id", report.video_id).maybeSingle();
    const current = cv?.halal_score ?? 50;
    const next = Math.max(0, Math.min(100, current + delta));
    await supabase.from("curated_videos").update({ halal_score: next }).eq("video_id", report.video_id);
    await recordAction(report, delta < 0 ? "lower_halal_score" : "raise_halal_score",
      { status: "resolved_score_adjusted", resolution: `score:${next}` },
      { previous: current, next, delta });
  };

  const currentList = grouped[tab] ?? [];

  return (
    <div className={embedded ? "" : "min-h-dvh bg-background"}>
      <SEO title="User Reports — Heartify Admin" description="Review reports submitted by Heartify users about content and channels." path="/admin/reports" />
      {!embedded && <Navbar />}
      <main className={embedded ? "" : "mx-auto max-w-6xl px-4 py-6"}>
        {!embedded && (
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <ShieldAlert className="h-6 w-6 text-primary" /> Community reports
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Reports never auto-remove content. Every action here is logged for audit.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/moderation">Back to moderation</Link>
            </Button>
          </header>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATUS_TABS.map((s) => (
            <Card key={s.value}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 text-2xl font-bold">
                {loading ? "—" : grouped[s.value]?.length ?? 0}
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
            ))}
          </TabsList>
          {STATUS_TABS.map((s) => (
            <TabsContent key={s.value} value={s.value} className="mt-4">
              {loading ? (
                <div className="space-y-3" role="status" aria-label="Loading reports">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                      <Skeleton className="mt-3 h-4 w-2/3" />
                      <Skeleton className="mt-2 h-3 w-1/2" />
                    </div>
                  ))}
                  <span className="sr-only">Loading reports…</span>
                </div>
              ) : currentList.length === 0 ? (
                <EmptyState
                  icon={ShieldAlert}
                  tone="muted"
                  title={`No ${s.label.toLowerCase()} reports`}
                  description="When users flag content, it will land here for triage. Zero reports means the community is calm — al-ḥamdu lillāh."
                />
              ) : (
                <div className="space-y-3">
                  {currentList.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={severityColor(r.severity)}>{r.severity}</Badge>
                            <Badge variant="outline">{REASON_LABEL[r.reason] ?? r.reason}</Badge>
                            {r.notify_reporter && <Badge variant="secondary" className="gap-1"><MessageSquare className="h-3 w-3" /> notify</Badge>}
                          </div>
                          <div className="mt-2 truncate text-sm font-medium">
                            {r.video_title ?? r.channel_title ?? r.video_id ?? r.channel_id ?? "(untitled)"}
                          </div>
                          {r.details && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.details}</p>}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" /> Report {selected.id.slice(0, 8)}
                </SheetTitle>
                <SheetDescription>
                  {REASON_LABEL[selected.reason] ?? selected.reason} · {selected.severity} · {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="font-medium">{selected.video_title ?? selected.channel_title ?? "(untitled)"}</div>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {selected.video_id && <div>Video ID: <code>{selected.video_id}</code></div>}
                    {selected.channel_id && <div>Channel ID: <code>{selected.channel_id}</code></div>}
                    {selected.channel_title && <div>Channel: {selected.channel_title}</div>}
                  </div>
                  {selected.video_id && (
                    <a
                      href={`/watch/${selected.video_id}`}
                      target="_blank" rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open video <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {selected.details && (
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Reporter details</Label>
                    <p className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm">{selected.details}</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="mod-note" className="text-xs uppercase tracking-wide text-muted-foreground">Moderator note</Label>
                  <Textarea
                    id="mod-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 2000))}
                    rows={2}
                    placeholder="Optional context saved with the action…"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline" size="sm" disabled={!!busy}
                    onClick={() => recordAction(selected, "investigate", { status: "investigating" })}
                  >
                    Mark investigating
                  </Button>
                  <Button
                    variant="outline" size="sm" disabled={!!busy || !selected.video_id}
                    onClick={() => adjustScore(selected, -20)}
                  >
                    <ArrowDownRight className="mr-1 h-4 w-4" /> Lower score
                  </Button>
                  <Button
                    variant="outline" size="sm" disabled={!!busy || !selected.video_id}
                    onClick={() => adjustScore(selected, +10)}
                  >
                    <ArrowUpRight className="mr-1 h-4 w-4" /> Raise score
                  </Button>
                  <Button
                    variant="destructive" size="sm" disabled={!!busy || !selected.video_id}
                    onClick={() => removeVideo(selected)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remove video
                  </Button>
                  <Button
                    variant="destructive" size="sm" disabled={!!busy}
                    onClick={() => banChannel(selected)}
                    className="col-span-2"
                  >
                    <Ban className="mr-1 h-4 w-4" /> Ban channel
                  </Button>
                  <Button
                    variant="secondary" size="sm" disabled={!!busy}
                    onClick={() => recordAction(selected, "dismiss",
                      { status: "dismissed_invalid", resolution: "dismissed" })}
                  >
                    <X className="mr-1 h-4 w-4" /> Dismiss
                  </Button>
                  <Button
                    variant="default" size="sm" disabled={!!busy}
                    onClick={() => recordAction(selected, "resolve",
                      { status: "resolved_no_action", resolution: "no_action_needed" })}
                  >
                    <Check className="mr-1 h-4 w-4" /> Resolve, no action
                  </Button>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Audit trail</Label>
                  {actions.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">No actions recorded yet.</p>
                  ) : (
                    <ul className="mt-1 space-y-2">
                      {actions.map((a) => (
                        <li key={a.id} className="rounded-md border border-border bg-background p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {a.notes && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{a.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
