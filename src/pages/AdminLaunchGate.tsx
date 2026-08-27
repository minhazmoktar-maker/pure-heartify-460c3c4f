import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  ShieldCheck,
  PlayCircle,
  Gauge,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

type Forecast = {
  generated_at: string;
  target_servable: number;
  servable_halal: number;
  awaiting_check: number;
  cleared_last_hour: number;
  cleared_last_24h: number;
  cleared_last_7d: number;
  rate_per_hour: number;
  rate_per_day: number;
  remaining_to_target: number;
  eta_hours: number | null;
  eta_days: number | null;
  eta_at: string | null;
  queue_drain_hours: number | null;
  stalled: boolean;
};

type WorkerConfig = {
  enabled: boolean;
  batch_size: number;
  concurrency: number;
  max_retries: number;
  backoff_ms: number;
  call_timeout_ms: number;
  budget_ms: number;
};

type SweepResult = {
  newly_marked: number;
  eligible_unchecked: number;
  checked_last_hour: number;
  alerted: boolean;
  ran_at: string;
  duration_ms: number;
};

const WORKER_FIELDS: Array<{ key: keyof Omit<WorkerConfig, "enabled">; label: string; min: number; max: number; hint: string }> = [
  { key: "concurrency", label: "Worker concurrency", min: 1, max: 64, hint: "Thumbnails classified in parallel per wave." },
  { key: "batch_size", label: "Batch size", min: 1, max: 300, hint: "Videos claimed per worker tick." },
  { key: "max_retries", label: "Max retries", min: 0, max: 5, hint: "Retries for timeouts / transient gateway errors." },
  { key: "backoff_ms", label: "Backoff (ms)", min: 100, max: 10000, hint: "Base delay, doubled with jitter per retry." },
  { key: "call_timeout_ms", label: "Call timeout (ms)", min: 2000, max: 60000, hint: "Hard limit per classification call." },
  { key: "budget_ms", label: "Tick budget (ms)", min: 10000, max: 240000, hint: "Wall-clock budget before partial results are saved." },
];

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
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [worker, setWorker] = useState<WorkerConfig | null>(null);
  const [savingWorker, setSavingWorker] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, b, r, f, w] = await Promise.all([
      supabase.rpc("admin_launch_gate", { p_target: 1000000 }),
      supabase.rpc("admin_video_status_breakdown"),
      supabase
        .from("video_sweep_runs")
        .select("id, ran_at, newly_marked, eligible_unchecked, checked_last_hour, alerted")
        .order("ran_at", { ascending: false })
        .limit(12),
      supabase.rpc("admin_launch_forecast", { p_target: 1000000 }),
      supabase
        .from("visual_scan_worker_config")
        .select("enabled, batch_size, concurrency, max_retries, backoff_ms, call_timeout_ms, budget_ms")
        .eq("id", "default")
        .maybeSingle(),
    ]);
    const err = g.error || b.error || r.error || f.error || w.error;
    if (err) toast({ title: err.message, variant: "destructive" });
    setGate((g.data as unknown as Gate) ?? null);
    setBreakdown((b.data as unknown as Breakdown) ?? null);
    setRuns((r.data as SweepRun[]) ?? []);
    setForecast((f.data as unknown as Forecast) ?? null);
    setWorker((w.data as WorkerConfig | null) ?? null);
    setLoading(false);
  }, []);

  /** Runs the queue sweep immediately instead of waiting for the 15-minute cron. */
  async function runSweepNow() {
    setSweeping(true);
    setSweepResult(null);
    const { data, error } = await supabase.rpc("admin_run_unchecked_sweep", { p_max: 20000 });
    setSweeping(false);
    if (error) {
      toast({ title: "Sweep failed", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as unknown as SweepResult;
    setSweepResult(result);
    toast({
      title: "Sweep complete",
      description: `Queued ${nf.format(result.newly_marked)}, ${nf.format(result.eligible_unchecked)} awaiting check.`,
    });
    void load();
  }

  async function saveWorker() {
    if (!worker) return;
    setSavingWorker(true);
    const { error } = await supabase
      .from("visual_scan_worker_config")
      .update(worker)
      .eq("id", "default");
    setSavingWorker(false);
    if (error) {
      toast({ title: "Could not save worker settings", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Worker settings saved", description: "Applied on the next scan tick." });
  }

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
      <SEO
        path="/admin/launch-gate"
        title="Launch gate — Heartify admin"
        description="Internal launch readiness gate for the Heartify video corpus."
      />

      <PageHeader
        title="Launch gate"
        subtitle="Corpus readiness, serving counts and the automated unchecked-queue sweep."
        icon={ShieldCheck}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-9"
              disabled={sweeping}
              onClick={() => void runSweepNow()}
            >
              <PlayCircle className={`mr-1.5 h-4 w-4 ${sweeping ? "animate-pulse" : ""}`} />
              {sweeping ? "Sweeping…" : "Run sweep"}
            </Button>
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

            {forecast && (
              <Card className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Throughput &amp; ETA to 1,000,000</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Cleared / hour", value: nf.format(forecast.rate_per_hour) },
                    { label: "Cleared / day", value: nf.format(forecast.rate_per_day) },
                    { label: "Last 24h", value: nf.format(forecast.cleared_last_24h) },
                    { label: "Last 7 days", value: nf.format(forecast.cleared_last_7d) },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-lg font-semibold tabular-nums">{m.value}</p>
                    </div>
                  ))}
                </div>
                {forecast.remaining_to_target === 0 ? (
                  <p className="text-sm font-medium text-primary">
                    Target reached — {nf.format(forecast.servable_halal)} strict-halal videos serving.
                  </p>
                ) : forecast.eta_at ? (
                  <p className="text-sm">
                    At the current clear-rate the remaining{" "}
                    {nf.format(forecast.remaining_to_target)} videos take{" "}
                    <span className="font-semibold">
                      {forecast.eta_days && forecast.eta_days >= 1
                        ? `${forecast.eta_days} days`
                        : `${forecast.eta_hours} hours`}
                    </span>{" "}
                    — projected{" "}
                    <span className="font-semibold">
                      {new Date(forecast.eta_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="text-sm text-destructive">
                    No videos cleared recently — throughput is stalled, so no ETA can be projected.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {forecast.queue_drain_hours !== null
                    ? `Current queue of ${nf.format(forecast.awaiting_check)} drains in ~${forecast.queue_drain_hours}h at this rate.`
                    : `Queue awaiting check: ${nf.format(forecast.awaiting_check)}.`}{" "}
                  Blended from the last hour, day and week so a single idle tick does not skew the forecast.
                </p>
              </Card>
            )}

            {worker && (
              <Card className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Visual-scan worker</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="worker-enabled" className="text-xs text-muted-foreground">
                      Enabled
                    </Label>
                    <Switch
                      id="worker-enabled"
                      checked={worker.enabled}
                      onCheckedChange={(v) => setWorker({ ...worker, enabled: v })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Raise concurrency to drain the queue faster. Retries use exponential backoff with
                  jitter, so timed-out or rate-limited thumbnails are retried safely and stay
                  claimable by the next tick.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {WORKER_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label htmlFor={`worker-${f.key}`} className="text-xs">
                        {f.label}
                      </Label>
                      <Input
                        id={`worker-${f.key}`}
                        type="number"
                        inputMode="numeric"
                        min={f.min}
                        max={f.max}
                        className="h-11"
                        value={worker[f.key]}
                        onChange={(e) =>
                          setWorker({
                            ...worker,
                            [f.key]: Math.max(
                              f.min,
                              Math.min(f.max, Number(e.target.value) || f.min),
                            ),
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="h-11 w-full sm:w-auto"
                  disabled={savingWorker}
                  onClick={() => void saveWorker()}
                >
                  {savingWorker ? "Saving…" : "Save worker settings"}
                </Button>
              </Card>
            )}

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
              {sweepResult && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                  <p className="font-medium">
                    Manual sweep finished in {nf.format(sweepResult.duration_ms)} ms
                  </p>
                  <p className="text-muted-foreground">
                    Queued {nf.format(sweepResult.newly_marked)} newly ingested videos ·{" "}
                    {nf.format(sweepResult.eligible_unchecked)} awaiting check ·{" "}
                    {nf.format(sweepResult.checked_last_hour)} checked in the last hour
                    {sweepResult.alerted ? " · alert raised" : ""}.
                  </p>
                </div>
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
