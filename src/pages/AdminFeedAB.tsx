/**
 * /admin/feed-ab — the personalization A/B readout.
 *
 * Compares the live v5 Gumbel ranking (control) against the higher-diversity
 * arm (`diverse`: tighter per-channel cap, wider sampling temperature, larger
 * long-tail quota) on the three metrics that decide whether more diversity is
 * actually better for users:
 *   • watch seconds per user  (value received)
 *   • autoplay pass rate      (safety gates not firing)
 *   • client error rate       (reliability)
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import SEO from "@/components/SEO";
import { usePermissions } from "@/hooks/usePermissions";

interface VariantRow {
  variant: string;
  subjects: number;
  identified_subjects: number;
  watchers: number;
  watch_seconds: number;
  watch_seconds_per_user: number;
  completion_rate: number | null;
  autoplay_starts: number;
  gate_blocks: number;
  autoplay_pass_rate: number | null;
  client_errors: number;
  error_rate: number | null;
  /** Serving telemetry written by the feed function (feed_serve_samples). */
  serves: number;
  latency_avg_ms: number | null;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  items_per_serve: number | null;
  cache_hit_rate: number | null;
  is_control: boolean;
}


interface Metrics {
  key: string;
  window_hours: number;
  generated_at: string;
  variants: VariantRow[];
  error?: string;
}

const WINDOWS = [24, 72, 168, 720];
/** Below this, a delta is noise — never call a winner on it. */
const MIN_SUBJECTS = 100;

function pctStr(v: number | null) {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

function msStr(v: number | null) {
  return v == null ? "—" : `${Math.round(v)}ms`;
}


function lift(variant: number | null, control: number | null) {
  if (variant == null || control == null || control === 0) return null;
  return ((variant - control) / control) * 100;
}

function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const good = invert ? value < 0 : value > 0;
  return (
    <span className={good ? "text-emerald-600" : value === 0 ? "" : "text-destructive"}>
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export default function AdminFeedAB() {
  const { hasMinRole } = usePermissions();
  const isAdmin = hasMinRole("admin") || hasMinRole("owner");
  const [data, setData] = useState<Metrics | null>(null);
  const [hours, setHours] = useState(168);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.rpc("experiment_feed_metrics", {
      p_key: "feed_diversity_v6",
      p_hours: hours,
    });
    if (err) setError(err.message);
    else setData(res as unknown as Metrics);
    setLoading(false);
  }, [hours]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">The experiment readout is restricted.</p>
      </main>
    );
  }

  const variants = data?.variants ?? [];
  const control = variants.find((v) => v.is_control) ?? variants[0];
  const treatment = variants.find((v) => !v.is_control);
  const enoughData =
    !!control && !!treatment && Math.min(control.subjects, treatment.subjects) >= MIN_SUBJECTS;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <SEO
        title="Feed A/B — Heartify admin"
        description="v5 personalization vs higher-diversity ranking: watch time, autoplay pass rate, errors."
        path="/admin/feed-ab"
        noBreadcrumbs
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Feed diversity A/B</h1>
          <p className="text-sm text-muted-foreground">
            Experiment <code>feed_diversity_v6</code> — control is the live v5 ranking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {WINDOWS.map((h) => (
            <Button key={h} size="sm" variant={h === hours ? "default" : "outline"} onClick={() => setHours(h)}>
              {h}h
            </Button>
          ))}
          <Button size="icon" variant="outline" onClick={() => void load()} aria-label="Refresh">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {data?.error && <p className="mb-4 text-sm text-destructive">{data.error}</p>}

      {!enoughData && variants.length > 0 && (
        <p className="mb-4 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Fewer than {MIN_SUBJECTS} exposed subjects per arm — treat the deltas below as directional only.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map((v) => (
          <Card key={v.variant}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {v.variant}
                {v.is_control && <Badge variant="outline" className="text-[10px]">control</Badge>}
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {v.subjects.toLocaleString()} subjects
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Watch sec / user</span>
                <span className="font-semibold tabular-nums">{v.watch_seconds_per_user}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Completion rate</span>
                <span className="tabular-nums">{pctStr(v.completion_rate)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Autoplay pass rate</span>
                <span className="tabular-nums">{pctStr(v.autoplay_pass_rate)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Gate blocks</span>
                <span className="tabular-nums">{v.gate_blocks.toLocaleString()}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Error rate</span>
                <span className="tabular-nums">{pctStr(v.error_rate)}</span>
              </p>
              <p className="flex justify-between border-t border-border/60 pt-1">
                <span className="text-muted-foreground">Feed serves</span>
                <span className="tabular-nums">{(v.serves ?? 0).toLocaleString()}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Latency p50 / p95</span>
                <span className="tabular-nums">
                  {msStr(v.latency_p50_ms)} / {msStr(v.latency_p95_ms)}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Latency avg</span>
                <span className="tabular-nums">{msStr(v.latency_avg_ms)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Cache hit rate</span>
                <span className="tabular-nums">{pctStr(v.cache_hit_rate)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Items / serve</span>
                <span className="tabular-nums">{v.items_per_serve ?? "—"}</span>
              </p>
            </CardContent>
          </Card>
        ))}
        {variants.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No exposures recorded in this window yet.</p>
        )}
      </div>


      {control && treatment && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lift vs control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Watch sec / user</span>
              <Delta value={lift(treatment.watch_seconds_per_user, control.watch_seconds_per_user)} />
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Autoplay pass rate</span>
              <Delta value={lift(treatment.autoplay_pass_rate, control.autoplay_pass_rate)} />
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Feed latency p95 (lower is better)</span>
              <Delta value={lift(treatment.latency_p95_ms, control.latency_p95_ms)} invert />
            </p>

            <p className="flex justify-between">
              <span className="text-muted-foreground">Error rate (lower is better)</span>
              <Delta value={lift(treatment.error_rate, control.error_rate)} invert />
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
