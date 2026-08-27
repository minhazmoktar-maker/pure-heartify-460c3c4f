import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { downloadCsv, downloadJson, timestampSlug } from "@/lib/download";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Snapshot = {
  captured_at: string;
  dedup_pending: number;
  canonical_pending: number;
  visual_unchecked: number;
  visual_unchecked_approved: number;
  dedup_grouped_last_hour: number;
  visual_checked_last_hour: number;
  dlq_open: number;
};

type WorkerHealth = {
  series: Snapshot[];
  latest: Snapshot | null;
  targets: Record<string, number | null>;
  drain_rate_6h: Record<string, number | null>;
  sla_ok: Record<string, boolean>;
  computed_at: string;
};

type Replay = {
  mode: string;
  hours: number;
  metrics: Record<string, number | null>;
  findings: Array<Record<string, unknown>>;
  would_alert_count: number;
  computed_at: string;
};

type Threshold = {
  segment: string;
  min_baseline: number;
  drop_ratio: number;
  min_weekly_impressions: number;
  enabled: boolean;
};

type RouteRow = {
  id: string;
  kind: string | null;
  min_severity: string;
  slack: boolean;
  email: boolean;
  enabled: boolean;
};

const SEVERITIES = ["info", "warning", "error", "critical"];

/** Alert kinds raised by the reliability crons, offered even when no routing row exists yet. */
const KNOWN_ALERT_KINDS = [
  "dedup_backfill_lag",
  "canonical_pick_lag",
  "feed_quality_novelty_dip",
  "feed_quality_coverage_dip",
  "feed_quality_diversity_dip",
  "serve_throughput_flatline",
  "worker_health_sla_breach",
  "serving_predicate_visual_spike",
  "serving_predicate_halal_spike",
  "pipeline_watchdog",
];

type SimRecipient = {
  channel: string;
  target: string | null;
  deliverable: boolean;
  blocked_reason: string | null;
};

type Simulation = {
  mode: string;
  sent: boolean;
  transports: { slack: boolean; email: boolean; email_recipient_count: number };
  would_notify_count: number;
  results: Array<{
    kind: string;
    severity: string;
    would_notify: boolean;
    reason: string;
    matched_route: string | null;
    recipients: SimRecipient[];
  }>;
};


/**
 * Reliability console — worker-health SLA, alert routing, watchdog tuning and a
 * read-only replay of the last 24h of recorded metrics.
 *
 * Replay never writes alerts or touches knobs: it re-evaluates the same
 * thresholds so a remediation can be verified before it is applied for real.
 */
export default function AdminReliability() {
  const [health, setHealth] = useState<WorkerHealth | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [replayHours, setReplayHours] = useState(24);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [targets, setTargets] = useState<Array<{ worker: string; min_per_hour: number; enabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [h, t, r, w] = await Promise.all([
      supabase.rpc("admin_worker_health", { p_hours: 48 }),
      supabase.from("serve_throughput_thresholds").select("*").order("segment"),
      supabase.from("alert_routing_config").select("*").order("kind", { nullsFirst: true }),
      supabase.from("worker_sla_targets").select("*").order("worker"),
    ]);
    if (h.error) toast({ title: h.error.message, variant: "destructive" });
    setHealth((h.data ?? null) as unknown as WorkerHealth | null);
    setThresholds((t.data ?? []) as Threshold[]);
    setRoutes((r.data ?? []) as RouteRow[]);
    setTargets((w.data ?? []) as Array<{ worker: string; min_per_hour: number; enabled: boolean }>);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runReplay() {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_replay_quality_checks", {
      p_hours: replayHours,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Replay failed", description: error.message, variant: "destructive" });
      return;
    }
    setReplay(data as unknown as Replay);
  }

  async function saveThreshold(row: Threshold) {
    const { error } = await supabase
      .from("serve_throughput_thresholds")
      .upsert(row, { onConflict: "segment" });
    toast(
      error
        ? { title: "Save failed", description: error.message, variant: "destructive" }
        : { title: `Saved thresholds for ${row.segment}` },
    );
  }

  async function saveRoute(row: RouteRow) {
    const { error } = await supabase
      .from("alert_routing_config")
      .update({
        min_severity: row.min_severity,
        slack: row.slack,
        email: row.email,
        enabled: row.enabled,
      })
      .eq("id", row.id);
    toast(
      error
        ? { title: "Save failed", description: error.message, variant: "destructive" }
        : { title: `Routing saved for ${row.kind ?? "default"}` },
    );
  }

  async function saveTarget(worker: string, min_per_hour: number, enabled: boolean) {
    const { error } = await supabase
      .from("worker_sla_targets")
      .update({ min_per_hour, enabled })
      .eq("worker", worker);
    toast(
      error
        ? { title: "Save failed", description: error.message, variant: "destructive" }
        : { title: `SLA target saved for ${worker}` },
    );
  }

  const series = (health?.series ?? []).map((s) => ({
    ...s,
    t: new Date(s.captured_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
      <SEO
        title="Reliability — Heartify Admin"
        description="Worker health SLA, alert routing, watchdog thresholds and metric replay."
        path="/admin/reliability"
      />
      <PageHeader
        title="Reliability"
        subtitle="Worker drain SLA, alert routing, watchdog tuning and 24h replay"
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading…" : "Reload"}
        </Button>
        {health?.latest && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadJson(health, `worker-health-${timestampSlug()}.json`)}
          >
            Export worker health JSON
          </Button>
        )}
      </div>

      {/* Worker health SLA */}
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Worker health SLA</h2>
          <div className="flex gap-2">
            {Object.entries(health?.sla_ok ?? {}).map(([k, ok]) => (
              <Badge key={k} variant={ok ? "secondary" : "destructive"}>
                {k}: {ok ? "on target" : "below target"}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Dedup pending" value={health?.latest?.dedup_pending} />
          <Stat label="Canonical pending" value={health?.latest?.canonical_pending} />
          <Stat
            label="Unchecked (approved)"
            value={health?.latest?.visual_unchecked_approved}
          />
          <Stat label="Open DLQ" value={health?.latest?.dlq_open} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56">
            <p className="mb-1 text-xs text-muted-foreground">Queue depth (48h)</p>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={40} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="visual_unchecked_approved"
                  name="Unchecked approved"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                />
                <Area
                  type="monotone"
                  dataKey="canonical_pending"
                  name="Canonical pending"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground) / 0.15)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56">
            <p className="mb-1 text-xs text-muted-foreground">Drain rate per hour (48h)</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={40} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="visual_checked_last_hour"
                  name="Videos checked/h"
                  stroke="hsl(var(--primary))"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dedup_grouped_last_hour"
                  name="Dedup grouped/h"
                  stroke="hsl(var(--accent-foreground))"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Drain targets — an alert (with automatic extra sweep passes) is raised when the
            6h average falls below target while the queue is non-empty.
          </p>
          {targets.map((t) => (
            <div key={t.worker} className="flex flex-wrap items-center gap-2">
              <span className="w-40 text-sm font-medium">{t.worker}</span>
              <span className="text-xs text-muted-foreground">
                now {health?.drain_rate_6h?.[t.worker] ?? "—"}/h
              </span>
              <Input
                type="number"
                className="h-9 w-28"
                value={t.min_per_hour}
                aria-label={`${t.worker} target per hour`}
                onChange={(e) =>
                  setTargets((prev) =>
                    prev.map((p) =>
                      p.worker === t.worker
                        ? { ...p, min_per_hour: Number(e.target.value) }
                        : p,
                    ),
                  )
                }
              />
              <Switch
                checked={t.enabled}
                aria-label={`${t.worker} SLA enabled`}
                onCheckedChange={(v) =>
                  setTargets((prev) =>
                    prev.map((p) => (p.worker === t.worker ? { ...p, enabled: v } : p)),
                  )
                }
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveTarget(t.worker, t.min_per_hour, t.enabled)}
              >
                Save
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Replay */}
      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Replay recorded metrics (dry run)</h2>
        <p className="text-xs text-muted-foreground">
          Re-runs the dedup, canonical, novelty, coverage, diversity and throughput checks on
          the recorded metrics without writing alerts or changing ranking knobs.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            max={168}
            value={replayHours}
            aria-label="Replay window in hours"
            className="h-9 w-24"
            onChange={(e) => setReplayHours(Number(e.target.value))}
          />
          <span className="text-xs text-muted-foreground">hours</span>
          <Button size="sm" onClick={runReplay} disabled={busy}>
            {busy ? "Replaying…" : "Replay last window"}
          </Button>
          {replay && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadJson(replay, `replay-${timestampSlug()}.json`)}
            >
              Export JSON
            </Button>
          )}
        </div>
        {replay && (
          <div className="space-y-2 border-t pt-3">
            <Badge variant={replay.would_alert_count === 0 ? "secondary" : "destructive"}>
              {replay.would_alert_count === 0
                ? "No checks would fire"
                : `${replay.would_alert_count} check(s) would fire`}
            </Badge>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(replay.metrics ?? {}).map(([k, v]) => (
                <Stat key={k} label={k.replace(/_/g, " ")} value={v} />
              ))}
            </div>
            {replay.findings?.length > 0 && (
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(replay.findings, null, 2)}
              </pre>
            )}
          </div>
        )}
      </Card>

      {/* Serve throughput thresholds */}
      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Serve-throughput watchdog thresholds</h2>
        <p className="text-xs text-muted-foreground">
          `global` controls flatline sensitivity overall; add a row per language segment
          (e.g. `bn`, `ur`) to tune how much weekly volume a segment needs before a
          zero-impression day counts as a flatline.
        </p>
        <div className="space-y-2">
          {thresholds.map((row) => (
            <div key={row.segment} className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-sm font-medium">{row.segment}</span>
              <LabeledNumber
                label="min baseline"
                value={row.min_baseline}
                onChange={(v) =>
                  setThresholds((p) =>
                    p.map((x) => (x.segment === row.segment ? { ...x, min_baseline: v } : x)),
                  )
                }
              />
              <LabeledNumber
                label="drop ratio"
                step="0.05"
                value={row.drop_ratio}
                onChange={(v) =>
                  setThresholds((p) =>
                    p.map((x) => (x.segment === row.segment ? { ...x, drop_ratio: v } : x)),
                  )
                }
              />
              <LabeledNumber
                label="min weekly"
                value={row.min_weekly_impressions}
                onChange={(v) =>
                  setThresholds((p) =>
                    p.map((x) =>
                      x.segment === row.segment ? { ...x, min_weekly_impressions: v } : x,
                    ),
                  )
                }
              />
              <Switch
                checked={row.enabled}
                aria-label={`${row.segment} watchdog enabled`}
                onCheckedChange={(v) =>
                  setThresholds((p) =>
                    p.map((x) => (x.segment === row.segment ? { ...x, enabled: v } : x)),
                  )
                }
              />
              <Button size="sm" variant="outline" onClick={() => saveThreshold(row)}>
                Save
              </Button>
            </div>
          ))}
          <AddSegment
            onAdd={async (segment) => {
              const { error } = await supabase
                .from("serve_throughput_thresholds")
                .insert({ segment });
              if (error) {
                toast({ title: error.message, variant: "destructive" });
                return;
              }
              void load();
            }}
          />
        </div>
      </Card>

      {/* Alert routing */}
      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Alert routing (Slack / email)</h2>
        <p className="text-xs text-muted-foreground">
          Cron-raised alerts are fanned out every 5 minutes. Each alert uses its own row when
          present, otherwise the default row. Delivery outcome is recorded on the alert.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Alert kind</th>
                <th className="p-2 text-left">Min severity</th>
                <th className="p-2">Slack</th>
                <th className="p-2">Email</th>
                <th className="p-2">Enabled</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {routes.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-2 font-medium">{row.kind ?? "default (all others)"}</td>
                  <td className="p-2">
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                      aria-label={`Minimum severity for ${row.kind ?? "default"}`}
                      value={row.min_severity}
                      onChange={(e) =>
                        setRoutes((p) =>
                          p.map((x) =>
                            x.id === row.id ? { ...x, min_severity: e.target.value } : x,
                          ),
                        )
                      }
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <Switch
                      checked={row.slack}
                      aria-label={`Slack for ${row.kind ?? "default"}`}
                      onCheckedChange={(v) =>
                        setRoutes((p) =>
                          p.map((x) => (x.id === row.id ? { ...x, slack: v } : x)),
                        )
                      }
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Switch
                      checked={row.email}
                      aria-label={`Email for ${row.kind ?? "default"}`}
                      onCheckedChange={(v) =>
                        setRoutes((p) =>
                          p.map((x) => (x.id === row.id ? { ...x, email: v } : x)),
                        )
                      }
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Switch
                      checked={row.enabled}
                      aria-label={`Enabled for ${row.kind ?? "default"}`}
                      onCheckedChange={(v) =>
                        setRoutes((p) =>
                          p.map((x) => (x.id === row.id ? { ...x, enabled: v } : x)),
                        )
                      }
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => saveRoute(row)}>
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Simulate notifications */}
      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Simulate notifications (no sending)</h2>
        <p className="text-xs text-muted-foreground">
          Previews which Slack webhook and email recipients each alert kind and severity would
          reach under the current routing rules. Nothing is sent and no alert is written;
          recipients are masked.
        </p>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Alert kinds</p>
          <div className="flex flex-wrap gap-2">
            {kindOptions.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() =>
                  setSimKinds((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
                }
                className={`min-h-[44px] rounded-md border px-3 text-xs transition-colors ${
                  simKinds.includes(k) ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Severities</p>
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setSimSeverities((p) =>
                    p.includes(s) ? p.filter((x) => x !== s) : [...p, s],
                  )
                }
                className={`min-h-[44px] rounded-md border px-3 text-xs capitalize transition-colors ${
                  simSeverities.includes(s) ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={runSimulation}
            disabled={busy || simKinds.length === 0 || simSeverities.length === 0}
          >
            {busy ? "Simulating…" : "Preview recipients"}
          </Button>
          {sim && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadJson(sim, `notification-simulation-${timestampSlug()}.json`)}
            >
              Export simulation JSON
            </Button>
          )}
        </div>

        {sim && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Nothing sent</Badge>
              <Badge variant={sim.transports?.slack ? "secondary" : "destructive"}>
                Slack {sim.transports?.slack ? "configured" : "not configured"}
              </Badge>
              <Badge variant={sim.transports?.email ? "secondary" : "destructive"}>
                Email {sim.transports?.email ? "configured" : "not configured"}
              </Badge>
              <Badge variant="outline">{sim.would_notify_count} combination(s) notify</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Kind</th>
                    <th className="p-2 text-left">Severity</th>
                    <th className="p-2 text-left">Matched route</th>
                    <th className="p-2 text-left">Recipients</th>
                    <th className="p-2 text-left">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.results?.map((r) => (
                    <tr key={`${r.kind}-${r.severity}`} className="border-b last:border-0">
                      <td className="p-2 font-medium">{r.kind}</td>
                      <td className="p-2 capitalize">{r.severity}</td>
                      <td className="p-2 text-xs">{r.matched_route ?? "—"}</td>
                      <td className="p-2 text-xs">
                        {r.recipients.length === 0
                          ? "—"
                          : r.recipients.map((rec, i) => (
                              <span key={i} className="block">
                                {rec.channel}: {rec.target ?? "not configured"}
                                {rec.blocked_reason ? ` (${rec.blocked_reason})` : ""}
                              </span>
                            ))}
                      </td>
                      <td className="p-2">
                        <Badge variant={r.would_notify ? "secondary" : "outline"}>
                          {r.would_notify ? "would notify" : r.reason}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Incident timeline export */}
      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Export reliability incident timeline</h2>
        <p className="text-xs text-muted-foreground">
          Compiles alert history (with delivery outcome), replay results, worker-health
          snapshots, remediation actions and daily serving audits into one download.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            max={30}
            value={timelineDays}
            aria-label="Timeline window in days"
            className="h-9 w-24"
            onChange={(e) => setTimelineDays(Number(e.target.value))}
          />
          <span className="text-xs text-muted-foreground">days</span>
          <Button size="sm" disabled={busy} onClick={() => exportTimeline("json")}>
            Export JSON
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => exportTimeline("csv")}>
            Export CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}


function Stat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">
        {value === null || value === undefined ? "—" : Number(value).toLocaleString()}
      </p>
    </div>
  );
}

function LabeledNumber({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        type="number"
        step={step}
        value={value}
        className="h-9 w-24"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function AddSegment({ onAdd }: { onAdd: (segment: string) => void }) {
  const [seg, setSeg] = useState("");
  return (
    <div className="flex items-center gap-2 border-t pt-3">
      <Input
        value={seg}
        onChange={(e) => setSeg(e.target.value)}
        placeholder="Add segment (language code)"
        className="h-9 w-56"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={!seg.trim()}
        onClick={() => {
          onAdd(seg.trim());
          setSeg("");
        }}
      >
        Add segment
      </Button>
    </div>
  );
}
