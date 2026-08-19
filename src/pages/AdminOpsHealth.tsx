/**
 * /admin/ops-health — production observability dashboard.
 *
 * Backed by `public.function_health(hours)`, which aggregates the
 * `function_metrics` rows written by every instrumented edge function
 * (see supabase/functions/_shared/observe.ts).
 *
 * Alert thresholds mirror the ones enforced server-side:
 *   • error rate  > 1 %   → warn,  > 5 % → page
 *   • p95 latency > budget (per function) → warn
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import SEO from "@/components/SEO";
import { usePermissions } from "@/hooks/usePermissions";

interface HealthRow {
  fn_name: string;
  requests: number;
  errors: number;
  error_rate: number;
  p50_ms: number;
  p95_ms: number;
  max_ms: number;
  last_seen: string;
}

/** p95 latency budgets — keep in sync with `LATENCY_BUDGET_MS` in observe.ts. */
const BUDGET_MS: Record<string, number> = {
  feed: 1200,
  recommendations: 1500,
  surfaces: 1500,
  search: 1000,
  "ingest-videos": 120_000,
};
const DEFAULT_BUDGET_MS = 3000;

function errorTone(rate: number) {
  if (rate > 0.05) return "text-destructive";
  if (rate > 0.01) return "text-amber-600";
  return "text-emerald-600";
}

export default function AdminOpsHealth() {
  const { hasMinRole } = usePermissions();
  const isAdmin = hasMinRole("admin") || hasMinRole("owner");
  const [rows, setRows] = useState<HealthRow[]>([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("function_health", { p_hours: hours });
    if (err) setError(err.message);
    else setRows((data ?? []) as HealthRow[]);
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
          This operations dashboard is restricted.
        </p>
      </main>
    );
  }

  const totalReq = rows.reduce((a, r) => a + Number(r.requests), 0);
  const totalErr = rows.reduce((a, r) => a + Number(r.errors), 0);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <SEO title="Ops health — Heartify admin" description="Edge function traffic, latency and error rates." noindex />

      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Ops health</h1>
          <p className="text-xs text-muted-foreground">
            {totalReq.toLocaleString()} requests · {totalErr.toLocaleString()} errors · last {hours}h
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {error && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!loading && rows.length === 0 && !error && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No metrics recorded in this window yet.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const budget = BUDGET_MS[r.fn_name] ?? DEFAULT_BUDGET_MS;
          const slow = Number(r.p95_ms) > budget;
          return (
            <Card key={r.fn_name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{r.fn_name}</CardTitle>
                <div className="flex gap-2">
                  {Number(r.error_rate) > 0.01 && (
                    <Badge variant="destructive">
                      {(Number(r.error_rate) * 100).toFixed(1)}% errors
                    </Badge>
                  )}
                  {slow && <Badge variant="secondary">p95 over budget</Badge>}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">Requests</div>
                  <div className="font-semibold">{Number(r.requests).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                  <div className={`font-semibold ${errorTone(Number(r.error_rate))}`}>
                    {Number(r.errors).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">p50 / p95</div>
                  <div className={`font-semibold ${slow ? "text-amber-600" : ""}`}>
                    {r.p50_ms} / {r.p95_ms} ms
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Budget · max</div>
                  <div className="font-semibold">
                    {budget} · {r.max_ms} ms
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
