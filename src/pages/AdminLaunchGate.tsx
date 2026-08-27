import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, RefreshCw, Download, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { downloadCsv, downloadJson, timestampSlug } from "@/lib/download";

type Check = { id: string; label: string; ok: boolean; detail: string };

type Gate = {
  generated_at: string;
  target_servable: number;
  corpus_total: number;
  approved_total: number;
  servable_halal: number;
  rejected: number;
  blocked: number;
  flagged: number;
  archived: number;
  awaiting_check: number;
  progress_pct: number;
  remaining_to_target: number;
  open_critical_alerts: number;
  last_sweep: {
    ran_at: string;
    eligible_unchecked: number;
    checked_last_hour: number;
    newly_marked: number;
    alerted: boolean;
  } | null;
  checks: Check[];
  ready: boolean;
};

type MatrixRow = {
  moderation_state: string;
  visual_state: string;
  is_archived: boolean;
  videos: number;
};

type Breakdown = {
  generated_at: string;
  moderation: Record<string, number>;
  visual: Record<string, number>;
  serving: Record<string, number>;
  matrix: MatrixRow[];
};

type SweepRun = {
  id: string;
  ran_at: string;
  newly_marked: number;
  eligible_unchecked: number;
  checked_last_hour: number;
  alerted: boolean;
};

const nf = new Intl.NumberFormat();

/**
 * Launch gate — the single admin screen that answers "can we launch?".
 *
 * It reads the server-side gate (`admin_launch_gate`) so the readiness verdict
 * is computed from the same rows that serve the feed, shows the automated
 * unchecked-queue sweep heartbeat, and exports the full status breakdown for
 * pre-launch sign-off.
 */
export default function AdminLaunchGate() {
  const [gate, setGate] = useState<Gate | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [runs, setRuns] = useState<SweepRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, b, r] = await Promise.all([
      supabase.rpc("admin_launch_gate", { p_target: 1000000 }),
      supabase.rpc("admin_video_status_breakdown"),
      supabase
        .from("video_sweep_runs")
        .select("id, ran_at, newly_marked, eligible_unchecked, checked_last_hour, alerted")
        .order("ran_at", { ascending: false })
        .limit(12),
    ]);
    const err = g.error || b.error || r.error;
    if (err) toast({ title: err.message, variant: "destructive" });
    setGate((g.data as unknown as Gate) ?? null);
    setBreakdown((b.data as unknown as Breakdown) ?? null);
    setRuns((r.data as SweepRun[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function exportJson() {
    if (!breakdown || !gate) return;
    downloadJson({ gate, breakdown }, `heartify-video-status-${timestampSlug()}.json`);
  }

  function exportCsv() {
    if (!breakdown) return;
    downloadCsv(
      breakdown.matrix.map((m) => ({
        moderation_state: m.moderation_state,
        visual_state: m.visual_state,
        is_archived: m.is_archived,
        videos: m.videos,
      })),
      `heartify-video-status-${timestampSlug()}.csv`,
    );
  }

  const stats: Array<{ label: string; value: number }> = gate
    ? [
        { label: "Corpus total", value: gate.corpus_total },
        { label: "Serving (strict halal)", value: gate.servable_halal },
        { label: "Approved", value: gate.approved_total },
        { label: "Rejected", value: gate.rejected },
        { label: "Blocked", value: gate.blocked },
        { label: "Flagged", value: gate.flagged },
        { label: "Archived", value: gate.archived },
        { label: "Awaiting check", value: gate.awaiting_check },
      ]
    : [];

  return (
    <>
      <SEO path="/admin/launch-gate" title="Launch gate — Heartify admin" noindex />
      <PageHeader
        title="Launch gate"
        subtitle="Corpus readiness, serving counts and the automated unchecked-queue sweep."
        icon={ShieldCheck}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9" onClick={() => void load()}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={exportJson}>
              <Download className="mr-1.5 h-4 w-4" /> JSON
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" /> CSV
            </Button>
          </div>
        }
      />

      <div className="container mx-auto max-w-4xl space-y-4 px-4 pb-24">
        {loading && !gate ? (
          <Card className="p-6 text-sm text-muted-foreground">Loading launch gate…</Card>
        ) : !gate ? (
          <Card className="p-6 text-sm text-muted-foreground">No data available.</Card>
        ) : (
          <>
            <Card className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Launch readiness</p>
                <Badge variant={gate.ready ? "default" : "secondary"}>
                  {gate.ready ? "Ready to launch" : "Not ready"}
                </Badge>
              </div>
              <Progress value={Math.min(gate.progress_pct, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {nf.format(gate.servable_halal)} of {nf.format(gate.target_servable)} strict-halal
                serving videos ({gate.progress_pct}%) —{" "}
                {nf.format(gate.remaining_to_target)} remaining to target.
              </p>
              <ul className="space-y-2 pt-1">
                {gate.checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    {c.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span>
                      <span className="font-medium">{c.label}</span>
                      <span className="block text-xs text-muted-foreground">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <Card key={s.label} className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold tabular-nums">{nf.format(s.value)}</p>
                </Card>
              ))}
            </div>

            <Card className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Automated sweep</p>
                <Button asChild size="sm" variant="ghost" className="h-8">
                  <Link to="/admin/unchecked-videos">Unchecked queue</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Runs every 15 minutes: newly ingested videos are pushed into the visual safety
                queue, and an alert fires when the queue rises above 1,000 items or stalls.
              </p>
              {gate.last_sweep ? (
                <p className="text-xs text-muted-foreground">
                  Last sweep {new Date(gate.last_sweep.ran_at).toLocaleString()} — queued{" "}
                  {nf.format(gate.last_sweep.newly_marked)}, awaiting{" "}
                  {nf.format(gate.last_sweep.eligible_unchecked)}, checked in last hour{" "}
                  {nf.format(gate.last_sweep.checked_last_hour)}.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No sweep recorded yet.</p>
              )}
              {runs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="text-left">
                        <th className="py-1 pr-3 font-medium">Ran at</th>
                        <th className="py-1 pr-3 font-medium">Queued</th>
                        <th className="py-1 pr-3 font-medium">Awaiting</th>
                        <th className="py-1 pr-3 font-medium">Checked / h</th>
                        <th className="py-1 font-medium">Alert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((r) => (
                        <tr key={r.id} className="border-t border-border/60">
                          <td className="py-1 pr-3">{new Date(r.ran_at).toLocaleString()}</td>
                          <td className="py-1 pr-3 tabular-nums">{nf.format(r.newly_marked)}</td>
                          <td className="py-1 pr-3 tabular-nums">
                            {nf.format(r.eligible_unchecked)}
                          </td>
                          <td className="py-1 pr-3 tabular-nums">
                            {nf.format(r.checked_last_hour)}
                          </td>
                          <td className="py-1">{r.alerted ? "yes" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {breakdown && (
              <Card className="space-y-3 p-5">
                <p className="text-sm font-semibold">Status breakdown</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="text-left">
                        <th className="py-1 pr-3 font-medium">Moderation</th>
                        <th className="py-1 pr-3 font-medium">Visual</th>
                        <th className="py-1 pr-3 font-medium">Archived</th>
                        <th className="py-1 font-medium">Videos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.matrix.map((m) => (
                        <tr
                          key={`${m.moderation_state}-${m.visual_state}-${m.is_archived}`}
                          className="border-t border-border/60"
                        >
                          <td className="py-1 pr-3">{m.moderation_state}</td>
                          <td className="py-1 pr-3">{m.visual_state}</td>
                          <td className="py-1 pr-3">{m.is_archived ? "yes" : "—"}</td>
                          <td className="py-1 tabular-nums">{nf.format(m.videos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generated {new Date(breakdown.generated_at).toLocaleString()}
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
