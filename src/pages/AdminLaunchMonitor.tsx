/**
 * /admin/launch-monitor — launch-day cockpit.
 *
 * One screen for the four launch risks, backed by `public.launch_monitor(hours)`:
 *   1. Halal serving floor  — clean / flagged / unchecked corpus + sweep throughput
 *   2. Feed personalization — measured cross-user overlap (Jaccard, sampled pairs)
 *   3. Autoplay & safety    — client-side gate blocks vs autoplay starts
 *   4. Reliability          — edge-function error rate + iOS / Android / web split
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import SEO from "@/components/SEO";
import { usePermissions } from "@/hooks/usePermissions";

interface FnRow {
  fn_name: string;
  requests: number;
  errors: number;
  error_rate: number;
  p95_ms: number | null;
}

interface LaunchMonitor {
  window_hours: number;
  generated_at: string;
  corpus: Record<string, number>;
  sweep: { checked_last_10m: number; checked_last_60m: number };
  feed_overlap_pct: number | null;
  feed_overlap_pairs: number;
  functions: FnRow[];
  platforms: Record<string, number>;
  gates: { safety_events: number; autoplay_starts: number; client_errors: number };
}

/** Overlap thresholds — YouTube-class personalization sits well under 25%. */
const OVERLAP_WARN = 25;
const OVERLAP_PAGE = 40;
/** Below this request count an error rate is statistically meaningless. */
const MIN_SAMPLES = 5;

function Stat({
  label,
  value,
  tone = "",
  hint,
}: {
  label: string;
  value: string;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminLaunchMonitor() {
  const { hasMinRole } = usePermissions();
  const isAdmin = hasMinRole("admin") || hasMinRole("owner");
  const [data, setData] = useState<LaunchMonitor | null>(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.rpc("launch_monitor", { p_hours: hours });
    if (err) setError(err.message);
    else setData(res as unknown as LaunchMonitor);
    setLoading(false);
  }, [hours]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The launch monitor is restricted.
        </p>
      </main>
    );
  }

  const corpus = data?.corpus ?? {};
  const clean = corpus.clean ?? 0;
  const flagged = corpus.flagged ?? 0;
  const unchecked = corpus.unchecked ?? 0;
  const total = Object.values(corpus).reduce((a, b) => a + Number(b), 0);
  const perMin = data ? Math.round(data.sweep.checked_last_10m / 10) : 0;
  const etaMin = perMin > 0 ? Math.round(unchecked / perMin) : null;
  const overlap = data?.feed_overlap_pct;
  const overlapTone =
    overlap == null
      ? "text-muted-foreground"
      : overlap >= OVERLAP_PAGE
        ? "text-destructive"
        : overlap >= OVERLAP_WARN
          ? "text-amber-600"
          : "text-emerald-600";

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <SEO
        title="Launch monitor — Heartify admin"
        description="Halal serving floor, feed personalization, safety gates and platform reliability."
        path="/admin/launch-monitor"
        noBreadcrumbs
      />

      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Launch monitor</h1>
          <p className="text-xs text-muted-foreground">
            Halal floor · feed overlap · safety gates · iOS / Android reliability
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 24, 168].map((h) => (
            <Button
              key={h}
              size="sm"
              variant={hours === h ? "default" : "outline"}
              onClick={() => setHours(h)}
            >
              {h === 1 ? "1h" : h === 24 ? "24h" : "7d"}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void load()} aria-label="Refresh">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {error && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && !data && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Loading launch metrics…
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                Halal serving floor
                {unchecked === 0 ? (
                  <Badge variant="secondary">fully checked</Badge>
                ) : (
                  <Badge variant="outline">{unchecked.toLocaleString()} in queue</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total videos" value={total.toLocaleString()} />
              <Stat
                label="Clean (servable)"
                value={clean.toLocaleString()}
                tone="text-emerald-600"
              />
              <Stat label="Flagged (blocked)" value={flagged.toLocaleString()} />
              <Stat
                label="Unchecked"
                value={unchecked.toLocaleString()}
                tone={unchecked > 0 ? "text-amber-600" : "text-emerald-600"}
                hint={
                  etaMin != null && unchecked > 0
                    ? `${perMin.toLocaleString()}/min · ~${Math.max(1, Math.round(etaMin / 60))}h left`
                    : "never served to users"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feed personalization</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat
                label="Cross-user overlap"
                value={overlap == null ? "—" : `${overlap}%`}
                tone={overlapTone}
                hint={`target < ${OVERLAP_WARN}%`}
              />
              <Stat
                label="Pairs sampled"
                value={(data.feed_overlap_pairs ?? 0).toLocaleString()}
                hint="Jaccard over recent impressions"
              />
              <Stat
                label="Window"
                value={`${data.window_hours}h`}
                hint={new Date(data.generated_at).toLocaleTimeString()}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Autoplay &amp; safety gates</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Gate blocks" value={data.gates.safety_events.toLocaleString()} />
              <Stat label="Autoplay starts" value={data.gates.autoplay_starts.toLocaleString()} />
              <Stat
                label="Client errors"
                value={data.gates.client_errors.toLocaleString()}
                tone={data.gates.client_errors > 0 ? "text-amber-600" : "text-emerald-600"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Platform split</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(data.platforms).length === 0 && (
                <p className="text-xs text-muted-foreground">No client events in this window.</p>
              )}
              {Object.entries(data.platforms).map(([p, c]) => (
                <Stat key={p} label={p} value={Number(c).toLocaleString()} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Backend reliability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.functions.length === 0 && (
                <p className="text-xs text-muted-foreground">No traffic recorded.</p>
              )}
              {data.functions.map((f) => {
                const rate = Number(f.error_rate);
                const low = Number(f.requests) < MIN_SAMPLES;
                const tone = low
                  ? "text-muted-foreground"
                  : rate >= 0.2
                    ? "text-destructive"
                    : rate >= 0.05
                      ? "text-amber-600"
                      : "text-emerald-600";
                return (
                  <div
                    key={f.fn_name}
                    className="flex items-center justify-between gap-3 border-b border-border/40 py-1.5 text-sm last:border-0"
                  >
                    <span className="truncate font-medium">{f.fn_name}</span>
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                      {Number(f.requests).toLocaleString()} req · p95{" "}
                      {f.p95_ms == null ? "—" : `${Number(f.p95_ms).toLocaleString()}ms`}
                    </span>
                    <span className={`shrink-0 tabular-nums text-xs font-semibold ${tone}`}>
                      {(rate * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
