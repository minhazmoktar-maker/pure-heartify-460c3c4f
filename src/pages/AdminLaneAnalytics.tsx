/**
 * /admin/lane-analytics — per-country and per-language validation of the 80/20
 * native vs diversified rule.
 *
 * Everything comes from the `lane_analytics` RPC (admin-gated, security
 * definer) over `lane_events`: impressions, click-through, watch seconds,
 * retention and completion — split by country × content language × lane.
 * The CSV export mirrors exactly what is on screen.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface LaneRow {
  country: string;
  content_language: string;
  lane: "native" | "diversified";
  impressions: number;
  clicks: number;
  watch_seconds: number;
  completed_watches: number;
  click_through: number;
  avg_watch_seconds: number;
  retention_pct: number;
}

const COLUMNS: Array<{ key: keyof LaneRow; label: string }> = [
  { key: "country", label: "Country" },
  { key: "content_language", label: "Language" },
  { key: "lane", label: "Lane" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "click_through", label: "CTR %" },
  { key: "watch_seconds", label: "Watch secs" },
  { key: "avg_watch_seconds", label: "Avg secs" },
  { key: "retention_pct", label: "Retention %" },
  { key: "completed_watches", label: "Completed" },
];

function toCsv(rows: LaneRow[]): string {
  const head = COLUMNS.map((c) => c.label).join(",");
  const body = rows.map((r) => COLUMNS.map((c) => String(r[c.key] ?? "")).join(","));
  return [head, ...body].join("\n");
}

export default function AdminLaneAnalytics() {
  const [days, setDays] = useState(30);
  const [countryFilter, setCountryFilter] = useState("");

  const query = useQuery({
    queryKey: ["lane-analytics", days],
    queryFn: async (): Promise<LaneRow[]> => {
      const { data, error } = await supabase.rpc("lane_analytics", { p_days: days });
      if (error) throw error;
      return (data ?? []) as unknown as LaneRow[];
    },
  });

  const rows = useMemo(() => {
    const all = query.data ?? [];
    const cc = countryFilter.trim().toUpperCase();
    return cc ? all.filter((r) => r.country.startsWith(cc)) : all;
  }, [query.data, countryFilter]);

  const totals = useMemo(() => {
    let nativeImpressions = 0;
    let diversifiedImpressions = 0;
    let clicks = 0;
    let watch = 0;
    for (const r of rows) {
      if (r.lane === "native") nativeImpressions += Number(r.impressions);
      else diversifiedImpressions += Number(r.impressions);
      clicks += Number(r.clicks);
      watch += Number(r.watch_seconds);
    }
    const total = nativeImpressions + diversifiedImpressions;
    return {
      total,
      clicks,
      watchHours: (watch / 3600).toFixed(1),
      nativeShare: total ? Math.round((nativeImpressions / total) * 100) : 0,
    };
  }, [rows]);

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heartify-lane-analytics-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEO path="/admin/lane-analytics" title="Lane analytics — Heartify admin" description="Per-country and per-language validation of the 80/20 content mix." noindex />
      <PageHeader
        title="Lane analytics"
        subtitle="Native vs diversified performance by country and language."
      />
      <div className="container mx-auto max-w-6xl space-y-4 px-4 pb-24">
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="lane-days">Window (days)</Label>
            <Input
              id="lane-days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))}
              className="h-11 w-28"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lane-country">Country (ISO)</Label>
            <Input
              id="lane-country"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              placeholder="BD"
              className="h-11 w-28"
            />
          </div>
          <Button
            variant="secondary"
            className="h-11"
            onClick={download}
            disabled={rows.length === 0}
            data-testid="lane-analytics-export"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Impressions", value: totals.total.toLocaleString() },
            { label: "Clicks", value: totals.clicks.toLocaleString() },
            { label: "Watch hours", value: totals.watchHours },
            { label: "Native share", value: `${totals.nativeShare}%` },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{stat.value}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-x-auto p-0">
          {query.isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : query.error ? (
            <p className="p-4 text-sm text-destructive">{(query.error as Error).message}</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No lane events in this window yet.</p>
          ) : (
            <table className="w-full text-sm" data-testid="lane-analytics-table">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-3 py-2 font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.country}-${r.content_language}-${r.lane}`} className="border-t border-border">
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        scope={c.key === "country" ? "row" : undefined}
                        className="whitespace-nowrap px-3 py-2 text-left font-normal text-foreground"
                      >
                        {String(r[c.key])}
                      </th>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
