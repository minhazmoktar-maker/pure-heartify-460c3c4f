import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Point = {
  day: string;
  sessions: number;
  exposures: number;
  unique_videos: number;
  novelty_pct: number | null;
  dup_group_avoidance_pct: number | null;
  item_coverage_pct: number | null;
};

type DedupHealth = {
  total: number;
  grouped: number;
  pending: number;
  grouped_pct: number;
  canonical_pending: number;
  throughput_last_hour: number;
  throughput_per_hour_6h: number;
  last_grouped_at: string | null;
  eta_hours: number | null;
};

type Alert = {
  id: string;
  kind: string;
  severity: string;
  message: string;
  created_at: string;
  context: {
    remediation?: {
      applied_at?: string;
      mode?: string;
      knob_changes?: Array<{ knob: string; from: number; to: number }>;
      actions?: Array<Record<string, unknown>>;
      reranking_sweep?: string;
    };
  } | null;
};

type Throughput = {
  bucket: string;
  exposures: number;
  sessions: number;
  unique_videos: number;
};

type Coverage = {
  total: number;
  approved: number;
  rejected: number;
  moderation_pending: number;
  visual_unchecked_approved: number;
  dedup_pending_approved: number;
  servable: number;
  checked_pct: number;
};

const RANGES = [7, 14, 30] as const;

/**
 * Feed quality dashboard: novelty %, duplicate-group avoidance % and item
 * coverage over time (from feed_sessions / feed_exposures), plus the health
 * of the semantic dedup backfill and any lag alerts it raised.
 */
export default function AdminFeedQuality() {
  const [days, setDays] = useState<number>(14);
  const [points, setPoints] = useState<Point[]>([]);
  const [health, setHealth] = useState<DedupHealth | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(range = days) {
    setLoading(true);
    const [ts, hp, al, cv] = await Promise.all([
      supabase.rpc("admin_feed_quality_timeseries", { p_days: range }),
      supabase.rpc("admin_dedup_backfill_health"),
      supabase
        .from("production_alerts")
        .select("id,kind,severity,message,created_at,context")
        .in("kind", [
          "dedup_backfill_stalled",
          "dedup_backfill_lag",
          "dedup_canonical_lag",
          "feed_novelty_dip",
          "feed_coverage_dip",
          "feed_diversity_dip",
          "feed_serve_flatline",
          "feed_segment_flatline",
        ])
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.rpc("admin_serving_coverage"),
    ]);
    if (ts.error) toast({ title: ts.error.message, variant: "destructive" });
    if (hp.error) toast({ title: hp.error.message, variant: "destructive" });
    setPoints(
      ((ts.data ?? []) as unknown as Point[]).map((p) => ({
        ...p,
        novelty_pct: p.novelty_pct === null ? null : Number(p.novelty_pct),
        dup_group_avoidance_pct:
          p.dup_group_avoidance_pct === null ? null : Number(p.dup_group_avoidance_pct),
        item_coverage_pct:
          p.item_coverage_pct === null ? null : Number(p.item_coverage_pct),
      })),
    );
    setHealth((hp.data ?? null) as unknown as DedupHealth | null);
    setAlerts((al.data ?? []) as unknown as Alert[]);
    setCoverage((cv.data ?? null) as unknown as Coverage | null);
    setLoading(false);
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const latest = points[points.length - 1];

  return (
    <div className="mx-auto max-w-5xl p-4 pb-24 space-y-6 md:p-6">
      <SEO
        title="Feed Quality — Heartify Admin"
        description="Novelty, duplicate-group avoidance and item coverage over time"
        path="/admin/feed-quality"
      />
      <PageHeader title="Feed Quality" subtitle="Novelty, dedup avoidance & coverage" />

      <div className="flex items-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={days === r ? "default" : "outline"}
            onClick={() => setDays(r)}
          >
            {r}d
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => load()} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {alerts.length > 0 && (
        <Card className="p-4 space-y-3 border-destructive/40">
          <h2 className="text-sm font-semibold">Open feed quality alerts</h2>
          {alerts.map((a) => {
            const rem = a.context?.remediation;
            return (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <Badge variant={a.severity === "critical" ? "destructive" : "secondary"}>
                  {a.severity}
                </Badge>
                <div className="space-y-1">
                  <p>{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.kind} · {new Date(a.created_at).toLocaleString()}
                  </p>
                  {rem && (
                    <div className="rounded-lg border bg-muted/40 p-2 text-xs">
                      <p className="font-medium">
                        Auto-remediation applied{rem.mode ? ` (${rem.mode})` : ""}
                      </p>
                      {(rem.knob_changes ?? []).map((k) => (
                        <p key={k.knob} className="text-muted-foreground">
                          {k.knob}: {k.from} → {k.to}
                        </p>
                      ))}
                      {rem.reranking_sweep && (
                        <p className="text-muted-foreground">
                          Re-ranking sweep: {rem.reranking_sweep}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}


      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Novelty (latest day)" value={pct(latest?.novelty_pct)} />
        <Stat label="Dup-group avoidance" value={pct(latest?.dup_group_avoidance_pct)} />
        <Stat label="Item coverage" value={pct(latest?.item_coverage_pct, 3)} />
        <Stat label="Sessions (latest day)" value={latest ? String(latest.sessions) : "—"} />
      </div>

      <Card className="p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Corpus check coverage</h2>
          <p className="text-xs text-muted-foreground">
            Every video must pass moderation and the visual safety check before it can
            be served. Anything left in the backlog is never shown to users.
          </p>
        </div>
        {!coverage ? (
          <Empty />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Library" value={coverage.total.toLocaleString()} />
              <Stat label="Checked" value={`${Number(coverage.checked_pct).toFixed(2)}%`} />
              <Stat label="Servable" value={coverage.servable.toLocaleString()} />
              <Stat
                label="Awaiting visual check"
                value={coverage.visual_unchecked_approved.toLocaleString()}
              />
              <Stat
                label="Awaiting dedup group"
                value={coverage.dedup_pending_approved.toLocaleString()}
              />
              <Stat label="Moderation pending" value={coverage.moderation_pending.toLocaleString()} />
              <Stat label="Approved" value={coverage.approved.toLocaleString()} />
              <Stat label="Rejected / blocked" value={coverage.rejected.toLocaleString()} />
            </div>
            <div className="h-2 overflow-hidden rounded-pill bg-muted" aria-hidden>
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, Number(coverage.checked_pct))}%` }}
              />
            </div>
          </>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Novelty & duplicate-group avoidance (%)</h2>
        {points.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="novelty_pct"
                  name="Novelty %"
                  stroke="hsl(var(--primary))"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dup_group_avoidance_pct"
                  name="Dup-group avoidance %"
                  stroke="hsl(var(--accent-foreground))"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Item coverage (% of eligible catalog served)</h2>
        {points.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="item_coverage_pct"
                  name="Coverage %"
                  stroke="hsl(var(--primary))"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-semibold">Semantic dedup backfill</h2>
        {!health ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Stat label="Grouped" value={`${health.grouped_pct}%`} />
            <Stat label="Pending" value={health.pending.toLocaleString()} />
            <Stat label="Grouped last hour" value={health.throughput_last_hour.toLocaleString()} />
            <Stat label="Per hour (6h avg)" value={String(health.throughput_per_hour_6h)} />
            <Stat label="Canonical pending" value={health.canonical_pending.toLocaleString()} />
            <Stat
              label="ETA"
              value={health.eta_hours === null ? "—" : `${health.eta_hours}h`}
            />
            <Stat
              label="Last grouped"
              value={
                health.last_grouped_at
                  ? new Date(health.last_grouped_at).toLocaleString()
                  : "—"
              }
            />
            <Stat label="Total videos" value={health.total.toLocaleString()} />
          </div>
        )}
      </Card>
    </div>
  );
}

function pct(v: number | null | undefined, digits = 1) {
  return v === null || v === undefined ? "—" : `${v.toFixed(digits)}%`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-sm text-muted-foreground">
      No feed exposures recorded in this window yet.
    </p>
  );
}
