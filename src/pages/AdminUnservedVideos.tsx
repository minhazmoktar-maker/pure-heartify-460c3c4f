import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { downloadCsv, downloadJson, timestampSlug } from "@/lib/download";

type Row = {
  video_id: string;
  title: string | null;
  channel_id: string | null;
  channel_title: string | null;
  gate: string;
  moderation_state: string | null;
  visual_state: string | null;
  visual_flags: string[] | null;
  duplicate_group_id: string | null;
  is_duplicate_canonical: boolean | null;
  is_hidden: boolean | null;
  hidden_reason: string | null;
  ingested_at: string | null;
  age_hours: number | null;
  total_count: number;
};

type Audit = {
  id: string;
  ran_at: string;
  total_videos: number;
  served_recent: number;
  servable: number;
  unserved: number;
  gates: Record<string, number>;
  rates: Record<string, number>;
};

/**
 * Every gating condition a video can fail on the way to being served, in the
 * same order the SQL classifier evaluates them, with the dashboard that owns
 * the metric behind each one.
 */
const GATES: Array<{
  key: string;
  label: string;
  hint: string;
  metricsPath: string;
  metricsLabel: string;
}> = [
  {
    key: "unchecked",
    label: "Unchecked",
    hint: "Visual safety sweep has not inspected the thumbnail yet.",
    metricsPath: "/admin/unchecked-videos",
    metricsLabel: "Unchecked queue",
  },
  {
    key: "visual_state",
    label: "Visual state",
    hint: "Sweep returned a non-clean verdict (flagged or error).",
    metricsPath: "/admin/reliability",
    metricsLabel: "Worker health",
  },
  {
    key: "halal_filter",
    label: "Halal filter",
    hint: "Title/channel matches a tier-1 or tier-2 halal deny pattern.",
    metricsPath: "/admin/moderation",
    metricsLabel: "Moderation",
  },
  {
    key: "dedup_lag",
    label: "Dedup lag",
    hint: "Not yet assigned to a semantic duplicate group.",
    metricsPath: "/admin/dedup",
    metricsLabel: "Dedup health",
  },
  {
    key: "canonical_lag",
    label: "Canonical lag",
    hint: "Grouped, but no canonical pick has been made yet.",
    metricsPath: "/admin/dedup",
    metricsLabel: "Dedup health",
  },
  {
    key: "duplicate_non_canonical",
    label: "Duplicate (non-canonical)",
    hint: "Intentionally suppressed in favour of its group canonical.",
    metricsPath: "/admin/dedup",
    metricsLabel: "Dedup health",
  },
  {
    key: "hidden",
    label: "Hidden",
    hint: "Manually or automatically hidden from serving.",
    metricsPath: "/admin/moderation",
    metricsLabel: "Moderation",
  },
  {
    key: "moderation_pending",
    label: "Moderation pending",
    hint: "Awaiting AI or human moderation decision.",
    metricsPath: "/admin/moderation",
    metricsLabel: "Moderation SLA",
  },
  {
    key: "moderation_rejected",
    label: "Moderation rejected",
    hint: "Rejected or blocked — correctly never served.",
    metricsPath: "/admin/moderation-audit",
    metricsLabel: "Moderation audit",
  },
  {
    key: "archived",
    label: "Archived",
    hint: "Removed from the active catalog.",
    metricsPath: "/admin/moderation-audit",
    metricsLabel: "Moderation audit",
  },
  {
    key: "eligible_never_served",
    label: "Eligible, never served",
    hint: "Passes every gate but the ranker has not surfaced it in the window.",
    metricsPath: "/admin/feed-quality",
    metricsLabel: "Feed coverage",
  },
];

const GATE_BY_KEY = Object.fromEntries(GATES.map((g) => [g.key, g]));
const PAGE = 50;

/**
 * Unserved-video drilldown: for every video that is not currently being
 * served, shows exactly which gating condition failed first and links to the
 * dashboard that owns that condition's metrics.
 */
export default function AdminUnservedVideos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [gate, setGate] = useState<string>("eligible_never_served");
  const [channel, setChannel] = useState("");
  const [windowDays, setWindowDays] = useState(7);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const filters = useCallback(
    () => ({
      _gate: gate || null,
      _channel: channel.trim() || null,
      _serve_window_days: windowDays,
    }),
    [gate, channel, windowDays],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [r, a] = await Promise.all([
      supabase.rpc("admin_unserved_videos", {
        ...filters(),
        _limit: PAGE,
        _offset: page * PAGE,
      }),
      supabase
        .from("serving_audit_reports")
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (r.error) toast({ title: "Load failed", description: r.error.message, variant: "destructive" });
    setRows((r.data ?? []) as unknown as Row[]);
    setAudit((a.data ?? null) as unknown as Audit | null);
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = rows[0]?.total_count ?? 0;

  async function runAudit() {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_run_serving_audit", {
      p_serve_window_days: windowDays,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Audit failed", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as unknown as { unserved?: number };
    toast({ title: `Audit written — ${(r?.unserved ?? 0).toLocaleString()} unserved` });
    void load();
  }

  /** Exports every row matching the active filters, paging the RPC server-side. */
  async function exportAll(format: "csv" | "json") {
    setBusy(true);
    const CHUNK = 500;
    const MAX = 10_000;
    const all: Row[] = [];
    try {
      for (let offset = 0; offset < MAX; offset += CHUNK) {
        const { data, error } = await supabase.rpc("admin_unserved_videos", {
          ...filters(),
          _limit: CHUNK,
          _offset: offset,
        });
        if (error) throw error;
        const batch = (data ?? []) as unknown as Row[];
        all.push(...batch);
        if (batch.length < CHUNK) break;
      }
      if (!all.length) {
        toast({ title: "Nothing to export for these filters" });
        return;
      }
      const clean = all.map(({ total_count: _t, ...rest }) => rest);
      const name = `unserved-videos-${timestampSlug()}`;
      if (format === "csv") downloadCsv(clean, `${name}.csv`);
      else downloadJson({ filters: filters(), exported: clean.length, rows: clean }, `${name}.json`);
      toast({ title: `Exported ${clean.length.toLocaleString()} rows` });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const gateCounts = useMemo(() => audit?.gates ?? {}, [audit]);
  const activeGate = GATE_BY_KEY[gate];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
      <SEO
        title="Unserved videos — Heartify Admin"
        description="Which gating condition keeps each video out of the served pool."
        path="/admin/unserved-videos"
      />
      <PageHeader
        title="Unserved videos"
        subtitle="Per-video gating diagnosis: unchecked, visual state, halal filter, dedup/canonical lag or serving predicate"
      />

      {/* Latest daily audit */}
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Latest daily serving audit</h2>
          <span className="text-xs text-muted-foreground">
            {audit ? new Date(audit.ran_at).toLocaleString() : "no report yet"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Catalog" value={audit?.total_videos} />
          <Stat label="Served in window" value={audit?.served_recent} />
          <Stat label="Servable pool" value={audit?.servable} />
          <Stat label="Unserved" value={audit?.unserved} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={runAudit} disabled={busy}>
            {busy ? "Working…" : "Run audit now"}
          </Button>
          {audit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadJson(audit, `serving-audit-${timestampSlug()}.json`)}
            >
              Export audit JSON
            </Button>
          )}
        </div>
      </Card>

      {/* Gate breakdown */}
      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Failed gating condition</h2>
        <div className="flex flex-wrap gap-2">
          {GATES.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => {
                setGate(g.key);
                setPage(0);
              }}
              className={`min-h-[44px] rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                gate === g.key ? "border-primary bg-primary/10" : "hover:bg-muted"
              }`}
            >
              <span className="block font-medium">{g.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {(gateCounts[g.key] ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
        {activeGate && (
          <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
            <span>{activeGate.hint}</span>
            <Button asChild size="sm" variant="outline">
              <Link to={activeGate.metricsPath}>{activeGate.metricsLabel} metrics →</Link>
            </Button>
          </div>
        )}
      </Card>

      {/* Filters + table */}
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">
            Channel
            <Input
              value={channel}
              className="h-9 w-56"
              placeholder="channel title or id"
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Serve window (days)
            <Input
              type="number"
              min={1}
              max={30}
              className="h-9 w-24"
              value={windowDays}
              onChange={(e) => {
                setWindowDays(Number(e.target.value));
                setPage(0);
              }}
            />
          </label>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => exportAll("csv")}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => exportAll("json")}>
            Export JSON
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {total.toLocaleString()} video(s) match — showing {rows.length}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Video</th>
                <th className="p-2 text-left">Gate</th>
                <th className="p-2 text-left">Moderation</th>
                <th className="p-2 text-left">Visual</th>
                <th className="p-2 text-left">Dedup</th>
                <th className="p-2 text-right">Age (h)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.video_id} className="border-b last:border-0">
                  <td className="max-w-[22rem] p-2">
                    <p className="truncate font-medium">{r.title ?? r.video_id}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.channel_title ?? "—"}
                    </p>
                  </td>
                  <td className="p-2">
                    <Badge variant={r.gate === "eligible_never_served" ? "secondary" : "outline"}>
                      {GATE_BY_KEY[r.gate]?.label ?? r.gate}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs">{r.moderation_state ?? "—"}</td>
                  <td className="p-2 text-xs">
                    {r.visual_state ?? "unchecked"}
                    {r.visual_flags?.length ? ` (${r.visual_flags.join(", ")})` : ""}
                  </td>
                  <td className="p-2 text-xs">
                    {r.duplicate_group_id
                      ? r.is_duplicate_canonical === true
                        ? "canonical"
                        : r.is_duplicate_canonical === false
                          ? "duplicate"
                          : "canonical pending"
                      : "ungrouped"}
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.age_hours ?? "—"}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    No videos are held by this gate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || (page + 1) * PAGE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
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
