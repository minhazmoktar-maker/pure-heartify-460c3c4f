import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { downloadCsv, timestampSlug } from "@/lib/download";

type Row = {
  video_id: string;
  title: string | null;
  channel_id: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  moderation_state: string;
  visual_state: string | null;
  visual_checked_at: string | null;
  ingested_at: string | null;
  age_hours: number | null;
  duplicate_group_id: string | null;
  is_duplicate_canonical: boolean | null;
  total_count: number;
};

type Dedup = "any" | "grouped" | "ungrouped" | "canonical";
const AGES = [
  { label: "Any age", value: "0" },
  { label: "> 6h", value: "6" },
  { label: "> 24h", value: "24" },
  { label: "> 7d", value: "168" },
  { label: "> 30d", value: "720" },
];
const PAGE = 100;

/**
 * Unchecked-videos drilldown.
 *
 * Lists approved videos that have not yet passed the visual safety sweep —
 * these are never served, so this page is the proof that nothing sits in the
 * backlog silently. Filters mirror the server RPC (channel, ingestion age,
 * duplicate-group status) and both requeue actions are bounded server-side.
 */
export default function AdminUncheckedVideos() {
  const [channel, setChannel] = useState("");
  const [age, setAge] = useState("0");
  const [dedup, setDedup] = useState<Dedup>("any");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function filters() {
    return {
      _channel: channel.trim() || null,
      _min_age_hours: age === "0" ? null : Number(age),
      _dedup_status: dedup === "any" ? null : dedup,
    };
  }

  async function load(nextPage = page) {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_unchecked_videos", {
      ...filters(),
      _limit: PAGE,
      _offset: nextPage * PAGE,
    });
    if (error) toast({ title: error.message, variant: "destructive" });
    const list = (data ?? []) as unknown as Row[];
    setRows(list);
    setTotal(list[0]?.total_count ?? 0);
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    load(0);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function queue(all: boolean) {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_queue_visual_scan", {
      ...filters(),
      _video_ids: all ? null : Array.from(selected),
      _max: all ? 2000 : 500,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Requeue failed", description: error.message, variant: "destructive" });
      return;
    }
    const queued = (data as { queued?: number } | null)?.queued ?? 0;
    toast({
      title: `Queued ${queued} video${queued === 1 ? "" : "s"} for the next sweep`,
      description: "The visual safety sweep picks these up within a minute.",
    });
    load(page);
  }

  function exportCsv() {
    if (rows.length === 0) return;
    downloadCsv(
      rows.map(({ total_count: _t, ...r }) => r),
      `unchecked-videos-${timestampSlug()}.csv`,
    );
  }

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.video_id));

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 space-y-6 md:p-6">
      <SEO
        title="Unchecked Videos — Heartify Admin"
        description="Approved videos still awaiting the visual safety sweep"
        path="/admin/unchecked-videos"
      />
      <PageHeader
        title="Unchecked videos"
        subtitle="Approved but not yet visually verified — never served until checked"
      />

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Creator / channel"
            className="h-9 w-52"
          />
          <Select value={age} onValueChange={setAge}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Ingestion age" />
            </SelectTrigger>
            <SelectContent>
              {AGES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dedup} onValueChange={(v) => setDedup(v as Dedup)}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Dedup status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any dedup status</SelectItem>
              <SelectItem value="grouped">Grouped</SelectItem>
              <SelectItem value="ungrouped">Ungrouped</SelectItem>
              <SelectItem value="canonical">Canonical pick</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => {
              setPage(0);
              load(0);
            }}
            disabled={loading}
          >
            {loading ? "Loading…" : "Apply filters"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Badge variant="secondary">{total.toLocaleString()} matching</Badge>
          <Badge variant="outline">{selected.size} selected</Badge>
          <Button size="sm" disabled={busy || selected.size === 0} onClick={() => queue(false)}>
            Queue selected for next sweep
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || total === 0}
            onClick={() => queue(true)}
          >
            Queue all matching (max 2,000/run)
          </Button>
        </div>
      </Card>

      {rows.length === 0 && !loading ? (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            No unchecked videos match these filters — the corpus is fully processed for this
            slice.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">
                  <Checkbox
                    checked={allOnPage}
                    aria-label="Select all on page"
                    onCheckedChange={(v) =>
                      setSelected(v ? new Set(rows.map((r) => r.video_id)) : new Set())
                    }
                  />
                </th>
                <th className="p-2 text-left">Video</th>
                <th className="p-2 text-left">Channel</th>
                <th className="p-2 text-right">Age (h)</th>
                <th className="p-2 text-left">Dedup</th>
                <th className="p-2 text-left">Last claim</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.video_id} className="border-b last:border-0">
                  <td className="p-2 align-top">
                    <Checkbox
                      checked={selected.has(r.video_id)}
                      aria-label={`Select ${r.title ?? r.video_id}`}
                      onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v) next.add(r.video_id);
                        else next.delete(r.video_id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td className="max-w-[24rem] p-2 align-top">
                    <p className="truncate font-medium">{r.title ?? "(untitled)"}</p>
                    <p className="text-xs text-muted-foreground">{r.video_id}</p>
                  </td>
                  <td className="max-w-[12rem] p-2 align-top">
                    <p className="truncate">{r.channel_title ?? "—"}</p>
                  </td>
                  <td className="p-2 text-right align-top tabular-nums">
                    {r.age_hours === null ? "—" : r.age_hours}
                  </td>
                  <td className="p-2 align-top">
                    {r.duplicate_group_id ? (
                      <Badge variant={r.is_duplicate_canonical ? "secondary" : "outline"}>
                        {r.is_duplicate_canonical ? "canonical" : "grouped"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">ungrouped</Badge>
                    )}
                  </td>
                  <td className="p-2 align-top text-xs text-muted-foreground">
                    {r.visual_checked_at
                      ? new Date(r.visual_checked_at).toLocaleString()
                      : "never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {total > PAGE && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0 || loading}
            onClick={() => {
              const p = page - 1;
              setPage(p);
              load(p);
            }}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {Math.ceil(total / PAGE)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={(page + 1) * PAGE >= total || loading}
            onClick={() => {
              const p = page + 1;
              setPage(p);
              load(p);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
