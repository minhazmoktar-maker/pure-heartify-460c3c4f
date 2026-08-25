/**
 * /admin/corpus-progress — live halal safety-check coverage over time.
 *
 * Backed by `public.corpus_progress(hours)`: a 10-minute time series of
 * clean / flagged / unchecked counts plus the measured sweep throughput and
 * the estimated time until the whole corpus is checked.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import SEO from "@/components/SEO";
import { usePermissions } from "@/hooks/usePermissions";

interface Point {
  captured_at: string;
  clean: number;
  flagged: number;
  unchecked: number;
  other: number;
  total: number;
}

interface Progress {
  generated_at: string;
  window_hours: number;
  current: Point;
  window_start: Point | null;
  checked_last_10m: number;
  checked_last_60m: number;
  checked_per_minute: number;
  eta_minutes: number | null;
  coverage_pct: number;
  series: Point[];
}

const WINDOWS = [6, 24, 72, 168];

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString();
}

function etaLabel(minutes: number | null) {
  if (minutes == null) return "no throughput measured";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 48) return `${h}h ${m}m`;
  return `${Math.round(h / 24)} days`;
}

function Stat({ label, value, tone = "", hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Dependency-free stacked bar chart — one bar per snapshot. */
function Series({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No snapshots in this window yet.</p>;
  }
  const max = Math.max(...points.map((p) => p.total)) || 1;
  return (
    <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Corpus coverage over time">
      {points.map((p) => {
        const h = (v: number) => `${(v / max) * 100}%`;
        return (
          <div
            key={p.captured_at}
            className="flex h-full min-w-[3px] flex-1 flex-col justify-end"
            title={`${new Date(p.captured_at).toLocaleString()} — clean ${fmt(p.clean)}, flagged ${fmt(
              p.flagged,
            )}, unchecked ${fmt(p.unchecked)}`}
          >
            <div className="w-full bg-muted" style={{ height: h(p.unchecked) }} />
            <div className="w-full bg-amber-500/70" style={{ height: h(p.flagged) }} />
            <div className="w-full bg-emerald-500/80" style={{ height: h(p.clean) }} />
          </div>
        );
      })}
    </div>
  );
}

export default function AdminCorpusProgress() {
  const { hasMinRole } = usePermissions();
  const isAdmin = hasMinRole("admin") || hasMinRole("owner");
  const [data, setData] = useState<Progress | null>(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.rpc("corpus_progress", { p_hours: hours });
    if (err) setError(err.message);
    else setData(res as unknown as Progress);
    setLoading(false);
  }, [hours]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">Corpus progress is restricted.</p>
      </main>
    );
  }

  const cur = data?.current;
  const start = data?.window_start;
  const checkedDelta =
    cur && start ? start.unchecked - cur.unchecked : null;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <SEO
        title="Corpus progress — Heartify admin"
        description="Live halal safety-check coverage: clean, flagged and unchecked videos over time with ETA."
        path="/admin/corpus-progress"
        noBreadcrumbs
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Corpus progress</h1>
          <p className="text-sm text-muted-foreground">
            Only <code>clean</code> videos are ever served — this is how fast the rest is clearing.
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Clean (servable)" value={fmt(cur?.clean)} tone="text-emerald-600" />
        <Stat label="Flagged" value={fmt(cur?.flagged)} tone="text-amber-600" />
        <Stat label="Unchecked" value={fmt(cur?.unchecked)} />
        <Stat label="Total" value={fmt(cur?.total)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Coverage" value={`${data?.coverage_pct ?? 0}%`} />
        <Stat label="Throughput" value={`${data?.checked_per_minute ?? 0}/min`} hint={`${fmt(data?.checked_last_60m)} in 60m`} />
        <Stat label="ETA to 100%" value={etaLabel(data?.eta_minutes ?? null)} />
        <Stat
          label={`Checked in ${hours}h`}
          value={checkedDelta == null ? "—" : fmt(Math.max(0, checkedDelta))}
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            Coverage over time
            <Badge variant="outline" className="text-[10px]">10-min snapshots</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Series points={data?.series ?? []} />
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500/80" /> clean
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-amber-500/70" /> flagged
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-muted" /> unchecked
            </span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
