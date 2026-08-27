import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";

type Trace = {
  id: number;
  created_at: string;
  user_id: string | null;
  session_id: string | null;
  surface: string | null;
  variant: string | null;
  cold_start: boolean | null;
  cold_start_strategy: string | null;
  diversity_level: number | null;
  ui_language: string | null;
  device_class: string | null;
  item_count: number | null;
  pool_size: number | null;
  distinct_channels: number | null;
  distinct_categories: number | null;
  distinct_languages: number | null;
  max_per_channel: number | null;
  duplicate_count: number | null;
  self_overlap: number | null;
  fresh_share: number | null;
  took_ms: number | null;
  guarantees: Record<string, unknown> | null;
  trace: unknown;
  item_ids: string[] | null;
};

const HOURS = [6, 24, 72, 168] as const;

/**
 * Per-feed rationale explorer.
 *
 * Every assembled feed writes a `feed_diversity_metrics` row containing the
 * pipeline trace (retrieval → filters → diversity → ranking) plus the
 * guarantees that were enforced. This page surfaces those rows so an admin can
 * answer "why was this video selected for this session?" without reading logs.
 */
export default function AdminFeedTraces() {
  const [hours, setHours] = useState<number>(24);
  const [session, setSession] = useState("");
  const [surface, setSurface] = useState("");
  const [rows, setRows] = useState<Trace[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(h = hours) {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_feed_traces", {
      _hours: h,
      _session_id: session.trim() || null,
      _surface: surface.trim() || null,
      _limit: 50,
    });
    if (error) toast({ title: error.message, variant: "destructive" });
    setRows(((data ?? []) as unknown as Trace[]));
    setLoading(false);
  }

  useEffect(() => {
    load(hours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  return (
    <div className="mx-auto max-w-5xl p-4 pb-24 space-y-6 md:p-6">
      <SEO
        title="Feed Rationale — Heartify Admin"
        description="Per-feed selection rationale and pipeline traces"
        path="/admin/feed-traces"
      />
      <PageHeader title="Feed rationale" subtitle="Why each feed was assembled the way it was" />

      <div className="flex flex-wrap items-center gap-2">
        {HOURS.map((h) => (
          <Button
            key={h}
            size="sm"
            variant={hours === h ? "default" : "outline"}
            onClick={() => setHours(h)}
          >
            {h}h
          </Button>
        ))}
        <Input
          value={session}
          onChange={(e) => setSession(e.target.value)}
          placeholder="session id"
          className="h-9 w-40"
        />
        <Input
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          placeholder="surface"
          className="h-9 w-32"
        />
        <Button size="sm" variant="ghost" onClick={() => load()} disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </Button>
        <Button size="sm" variant="outline" onClick={exportJson} disabled={rows.length === 0}>
          Export rationale (JSON)
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          Export rationale (CSV)
        </Button>
      </div>

      {rows.length === 0 && !loading && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            No feed assemblies recorded in this window.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{r.surface ?? "home"}</Badge>
              {r.variant && <Badge variant="outline">{r.variant}</Badge>}
              {r.cold_start && (
                <Badge>cold start{r.cold_start_strategy ? `: ${r.cold_start_strategy}` : ""}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
                {r.took_ms !== null ? ` · ${r.took_ms}ms` : ""}
                {r.session_id ? ` · session ${r.session_id.slice(0, 8)}…` : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <Metric label="Items" value={num(r.item_count)} />
              <Metric label="Pool" value={num(r.pool_size)} />
              <Metric label="Channels" value={num(r.distinct_channels)} />
              <Metric label="Categories" value={num(r.distinct_categories)} />
              <Metric label="Languages" value={num(r.distinct_languages)} />
              <Metric label="Max / channel" value={num(r.max_per_channel)} />
              <Metric label="Duplicates" value={num(r.duplicate_count)} />
              <Metric label="Self-overlap" value={ratio(r.self_overlap)} />
              <Metric label="Fresh share" value={ratio(r.fresh_share)} />
              <Metric label="Diversity level" value={num(r.diversity_level)} />
              <Metric label="Language" value={r.ui_language ?? "—"} />
              <Metric label="Device" value={r.device_class ?? "—"} />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
            >
              {openId === r.id ? "Hide pipeline trace" : "Show pipeline trace"}
            </Button>

            {openId === r.id && (
              <div className="space-y-3">
                {r.guarantees && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">
                      Guarantees enforced
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(r.guarantees).map(([k, v]) => (
                        <Badge
                          key={k}
                          variant={v === true ? "secondary" : v === false ? "destructive" : "outline"}
                        >
                          {k}: {String(v)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Pipeline steps (retrieval → filters → diversity → ranking)
                  </p>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {JSON.stringify(r.trace, null, 2)}
                  </pre>
                </div>
                {r.item_ids && r.item_ids.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">
                      Served video ids ({r.item_ids.length})
                    </p>
                    <p className="break-all text-xs text-muted-foreground">
                      {r.item_ids.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function num(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : String(v);
}
function ratio(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${(Number(v) * 100).toFixed(1)}%`;
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
