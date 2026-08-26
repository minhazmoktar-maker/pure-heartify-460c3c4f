/**
 * /admin/lane-analytics — per-country and per-language validation of the 80/20
 * native vs diversified rule.
 *
 * Everything comes from the `lane_analytics_filtered` RPC (admin-gated,
 * security definer) over `lane_events`: impressions, click-through, watch
 * seconds, retention and completion — split by country × content language ×
 * lane, and narrowable by date range, country, language and lane. The CSV
 * export mirrors exactly what is on screen.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES } from "@/i18n";

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

function toCsv(rows: LaneRow[], meta: Record<string, string>): string {
  const header = Object.entries(meta)
    .map(([k, v]) => `# ${k}: ${v || "all"}`)
    .join("\n");
  const head = COLUMNS.map((c) => c.label).join(",");
  const body = rows.map((r) => COLUMNS.map((c) => String(r[c.key] ?? "")).join(","));
  return [header, head, ...body].join("\n");
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export default function AdminLaneAnalytics() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("all");
  const [lane, setLane] = useState("all");

  const query = useQuery({
    queryKey: ["lane-analytics", from, to, country, language, lane],
    queryFn: async (): Promise<LaneRow[]> => {
      const { data, error } = await supabase.rpc("lane_analytics_filtered", {
        p_from: from || null,
        p_to: to || null,
        p_country: country.trim() ? country.trim().toUpperCase() : null,
        p_language: language === "all" ? null : language,
        p_lane: lane === "all" ? null : lane,
      });
      if (error) throw error;
      return (data ?? []) as unknown as LaneRow[];
    },
  });

  const rows = query.data ?? [];

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
    const csv = toCsv(rows, {
      from,
      to,
      country: country.trim().toUpperCase(),
      language: language === "all" ? "" : language,
      lane: lane === "all" ? "" : lane,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heartify-lane-analytics-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEO path="/admin/lane-analytics" title="Lane analytics — Heartify admin" description="Per-country and per-language validation of the 80/20 content mix." />
      <PageHeader
        title="Lane analytics"
        subtitle="Native vs diversified performance by country, language and date range."
      />
      <div className="container mx-auto max-w-6xl space-y-4 px-4 pb-24">
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="lane-from">From</Label>
            <Input
              id="lane-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 w-40"
              data-testid="lane-filter-from"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lane-to">To</Label>
            <Input
              id="lane-to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 w-40"
              data-testid="lane-filter-to"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lane-country">Country (ISO)</Label>
            <Input
              id="lane-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.slice(0, 2))}
              placeholder="BD"
              className="h-11 w-24"
              data-testid="lane-filter-country"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lane-language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="lane-language" className="h-11 w-40" data-testid="lane-filter-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.native}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lane-lane">Lane</Label>
            <Select value={lane} onValueChange={setLane}>
              <SelectTrigger id="lane-lane" className="h-11 w-40" data-testid="lane-filter-lane">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Both lanes</SelectItem>
                <SelectItem value="native">Native</SelectItem>
                <SelectItem value="diversified">Diversified</SelectItem>
              </SelectContent>
            </Select>
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
            <p className="p-4 text-sm text-muted-foreground">No lane events match these filters.</p>
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
