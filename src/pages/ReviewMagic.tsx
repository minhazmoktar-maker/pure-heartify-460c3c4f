// Magic-link admin review page. Route: /review/:token
// No AdminRoute/2FA wrapper — token from URL is the sole gate. The edge
// function validates the token on every request and logs usage.
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-review`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const BULK_CHUNK = 100;

type Candidate = {
  id: string;
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  description: string | null;
  category: string | null;
  language_detected: string | null;
  subscriber_count: number | null;
  risk_score: number | null;
  tier: string | null;
  confidence: number | null;
  moderation_summary: Record<string, unknown> | null;
  tier_reason: string[] | null;
};

type BulkAction = "approve" | "reject" | "escalate";

export default function ReviewMagic() {
  const { token = "" } = useParams();
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<BulkAction | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tierFilter, setTierFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: Candidate[] = [];
      const pageSize = 500;
      let offset = 0;
      let totalCount = 0;
      while (true) {
        const res = await fetch(
          `${FN_URL}?op=queue&token=${encodeURIComponent(token)}&limit=${pageSize}&offset=${offset}`,
          { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } },
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        const batch: Candidate[] = body.items ?? [];
        all.push(...batch);
        totalCount = body.total ?? all.length;
        setExpiresAt(body.session?.expires_at ?? null);
        setItems([...all]);
        setTotal(totalCount);
        if (batch.length < pageSize || all.length >= totalCount) break;
        offset += pageSize;
      }
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    if (tierFilter === "all") return items;
    if (tierFilter === "unresolved") return items.filter((c) => !c.tier);
    return items.filter((c) => (c.tier ?? "?") === tierFilter);
  }, [items, tierFilter]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length, unresolved: 0 };
    for (const c of items) {
      const k = c.tier ?? "unresolved";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const visibleSelectedCount = useMemo(
    () => visible.reduce((n, c) => (selected.has(c.id) ? n + 1 : n), 0),
    [visible, selected],
  );
  const allVisibleSelected = visible.length > 0 && visibleSelectedCount === visible.length;

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (checked) next.add(c.id);
        else next.delete(c.id);
      }
      return next;
    });
  }

  async function act(id: string, action: BulkAction) {
    setBusyId(id);
    try {
      const res = await fetch(`${FN_URL}?op=action&token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ id, action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setTotal((t) => Math.max(0, t - 1));
      toast.success(`${action} · ${id.slice(0, 6)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function bulkAct(action: BulkAction) {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.info("Select at least one channel.");
      return;
    }
    if (action !== "escalate") {
      const label = action === "approve" ? "approve" : "reject";
      const confirmed = window.confirm(`${label.toUpperCase()} ${ids.length} channel(s)?`);
      if (!confirmed) return;
    }

    setBulkBusy(action);
    let processed = 0;
    let failed = 0;
    const doneIds = new Set<string>();
    try {
      for (let i = 0; i < ids.length; i += BULK_CHUNK) {
        const chunk = ids.slice(i, i + BULK_CHUNK);
        const res = await fetch(`${FN_URL}?op=bulk&token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
          body: JSON.stringify({ ids: chunk, action }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        processed += body.processed ?? 0;
        failed += body.failed ?? 0;
        for (const r of body.results ?? []) {
          if (r.ok) doneIds.add(r.id);
        }
      }
      setItems((prev) => prev.filter((c) => !doneIds.has(c.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of doneIds) next.delete(id);
        return next;
      });
      setTotal((t) => Math.max(0, t - doneIds.size));
      toast.success(`Bulk ${action}: ${processed} ok${failed ? `, ${failed} failed` : ""}`);
    } catch (e) {
      toast.error(`Bulk ${action} failed: ${(e as Error).message}`);
    } finally {
      setBulkBusy(null);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Link invalid or expired
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{error}</p>
            <p>Ask the platform owner to mint a new review link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierFilters: Array<{ key: string; label: string }> = [
    { key: "all", label: "All" },
    { key: "S", label: "S" },
    { key: "A", label: "A" },
    { key: "B", label: "B" },
    { key: "C", label: "C" },
    { key: "D", label: "D" },
    { key: "unresolved", label: "Unresolved" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Channel review" description="Magic-link channel moderation" path="/review" />
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">Channel Review Queue</h1>
            <p className="text-xs text-muted-foreground truncate">
              {items.length}{total > items.length ? ` / ${total}` : ""} pending{loading ? " · loading…" : ""}
              {expiresAt ? ` · link expires ${new Date(expiresAt).toLocaleString()}` : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading || bulkBusy !== null}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tierFilters.map((f) => {
            const count = tierCounts[f.key] ?? 0;
            const active = tierFilter === f.key;
            return (
              <Button
                key={f.key}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => setTierFilter(f.key)}
                className="h-7 px-2 text-xs"
              >
                {f.label} · {count}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={(v) => toggleAllVisible(Boolean(v))}
              disabled={visible.length === 0 || bulkBusy !== null}
            />
            <span className="text-muted-foreground">
              Select all visible ({visible.length})
            </span>
          </label>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            disabled={selected.size === 0 || bulkBusy !== null}
            onClick={() => bulkAct("reject")}
          >
            {bulkBusy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
            Bulk reject
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={selected.size === 0 || bulkBusy !== null}
            onClick={() => bulkAct("escalate")}
          >
            {bulkBusy === "escalate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4 mr-1" />}
            Bulk escalate
          </Button>
          <Button
            size="sm"
            disabled={selected.size === 0 || bulkBusy !== null}
            onClick={() => bulkAct("approve")}
          >
            {bulkBusy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Bulk approve
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {loading && items.length === 0 && (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}
        {!loading && visible.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {items.length === 0 ? "Queue is empty. Nothing to review." : "No channels match this filter."}
          </p>
        )}

        {visible.map((c) => {
          const isSelected = selected.has(c.id);
          return (
            <Card key={c.id} className={isSelected ? "ring-2 ring-primary/40" : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Checkbox
                      className="mt-1"
                      checked={isSelected}
                      onCheckedChange={(v) => toggleOne(c.id, Boolean(v))}
                      disabled={bulkBusy !== null}
                      aria-label={`Select ${c.title}`}
                    />
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{c.title}</CardTitle>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {c.handle && <span>{c.handle}</span>}
                        <span className={c.subscriber_count == null ? "italic opacity-70" : "font-medium"}>
                          {c.subscriber_count != null ? `${c.subscriber_count.toLocaleString()} subs` : "subs: unresolved"}
                        </span>
                        {c.language_detected && <span>lang: {c.language_detected}</span>}
                        {c.category && <span>{c.category}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant={
                        c.tier === "S" || c.tier === "A" ? "default"
                        : c.tier === "B" ? "secondary"
                        : c.tier === "C" ? "outline"
                        : "destructive"
                      }
                    >
                      Tier {c.tier ?? "?"}
                    </Badge>
                    {c.subscriber_count != null && (
                      <Badge variant="outline" className="tabular-nums">
                        {c.subscriber_count >= 1_000_000
                          ? `${(c.subscriber_count / 1_000_000).toFixed(1)}M subs`
                          : c.subscriber_count >= 1_000
                          ? `${(c.subscriber_count / 1_000).toFixed(1)}K subs`
                          : `${c.subscriber_count} subs`}
                      </Badge>
                    )}
                    {c.risk_score != null && (
                      <Badge variant={c.risk_score >= 70 ? "destructive" : c.risk_score >= 50 ? "secondary" : "outline"}>
                        risk {c.risk_score}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{c.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`https://www.youtube.com/channel/${c.youtube_channel_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View on YouTube
                    </a>
                  </Button>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === c.id || bulkBusy !== null}
                    onClick={() => act(c.id, "reject")}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === c.id || bulkBusy !== null}
                    onClick={() => act(c.id, "escalate")}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" /> Escalate
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === c.id || bulkBusy !== null}
                    onClick={() => act(c.id, "approve")}
                  >
                    {busyId === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
