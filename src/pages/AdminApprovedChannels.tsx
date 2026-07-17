import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";
import { Loader2, ShieldAlert, Trash2, ExternalLink, RotateCcw, Search } from "lucide-react";

type Channel = {
  id: string;
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  category: string | null;
  status: "active" | "flagged" | "removed" | string;
  consistency_score: number | null;
  created_at: string;
  last_rechecked_at: string | null;
};

const PAGE_SIZE = 50;

const AdminApprovedChannels = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const [rows, setRows] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "removed" | "all">("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ mode: "soft" | "hard"; ids: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);

  const load = async () => {
    setLoading(true);
    setSelected(new Set());
    let query = supabase
      .from("approved_channels")
      .select("id, youtube_channel_id, title, handle, category, status, consistency_score, created_at, last_rechecked_at")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (q.trim()) query = query.or(`title.ilike.%${q}%,handle.ilike.%${q}%,youtube_channel_id.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Channel[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading, isAdmin, statusFilter, page]);

  const runSearch = async () => {
    setPage(0);
    await load();
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const softRemove = async (ids: string[]) => {
    setBusy(true);
    const { error } = await supabase
      .from("approved_channels")
      .update({ status: "removed", updated_at: new Date().toISOString() })
      .in("id", ids);
    setBusy(false);
    if (error) return toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    toast({ title: `Removed ${ids.length} channel${ids.length > 1 ? "s" : ""}`, description: "They will no longer surface in feeds." });
    await load();
  };

  const hardDelete = async (ids: string[]) => {
    setBusy(true);
    const { error } = await supabase.from("approved_channels").delete().in("id", ids);
    setBusy(false);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: `Deleted ${ids.length} channel${ids.length > 1 ? "s" : ""} permanently` });
    await load();
  };

  const restore = async (ids: string[]) => {
    setBusy(true);
    const { error } = await supabase
      .from("approved_channels")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .in("id", ids);
    setBusy(false);
    if (error) return toast({ title: "Restore failed", description: error.message, variant: "destructive" });
    toast({ title: `Restored ${ids.length} channel${ids.length > 1 ? "s" : ""}` });
    await load();
  };

  const selCount = selected.size;

  if (roleLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl p-6">
          <EmptyState icon={ShieldAlert} title="Admins only" description="This page is restricted to platform admins." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-16">
      <SEO
        title="Approved Channels · Heartify Admin"
        description="Manage and remove approved Heartify channels."
        path="/admin/approved-channels"
      />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Approved channels</h1>
            <p className="text-sm text-muted-foreground">
              Remove any channel from Heartify. Removed channels stop appearing in feeds immediately.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/admin/channel-pipeline">← Pipeline</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/discovery">Discovery</Link></Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            {(["active", "removed", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setPage(0); setStatusFilter(s); }}
                className={`min-h-9 rounded-md px-3 text-xs font-medium capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
            <Input
              placeholder="Search title, handle, or YouTube ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button size="sm" variant="outline" onClick={runSearch}><Search className="h-4 w-4" /></Button>
          </div>

          {selCount > 0 && (
            <div className="ml-auto flex items-center gap-2">
              {statusFilter !== "removed" && (
                <Button size="sm" variant="destructive" disabled={busy}
                  onClick={() => setConfirm({ mode: "soft", ids: Array.from(selected) })}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remove {selCount}
                </Button>
              )}
              {statusFilter === "removed" && (
                <>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => restore(Array.from(selected))}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Restore {selCount}
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy}
                    onClick={() => setConfirm({ mode: "hard", ids: Array.from(selected) })}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete forever
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading channels…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No channels"
            description={statusFilter === "removed" ? "No removed channels." : "No approved channels match your filter."}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={selected.size === rows.length && rows.length > 0}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground">
                {selCount > 0 ? `${selCount} selected` : `${rows.length} shown`}
              </span>
            </div>

            <div className="grid gap-2">
              {rows.map((c) => (
                <Card key={c.id} className={c.status === "removed" ? "opacity-70" : ""}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-3 md:p-4">
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                      aria-label={`Select ${c.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium">{c.title}</h3>
                        {c.category && <Badge variant="secondary" className="capitalize">{c.category}</Badge>}
                        {c.status !== "active" && (
                          <Badge variant={c.status === "removed" ? "destructive" : "outline"}>{c.status}</Badge>
                        )}
                        {typeof c.consistency_score === "number" && (
                          <Badge variant="outline">trust {c.consistency_score}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.handle ?? c.youtube_channel_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" asChild className="min-h-9">
                        <a href={`https://www.youtube.com/channel/${c.youtube_channel_id}`} target="_blank" rel="noreferrer noopener">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      {c.status === "removed" ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => restore([c.id])} disabled={busy}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Restore
                          </Button>
                          <Button size="sm" variant="destructive" disabled={busy}
                            onClick={() => setConfirm({ mode: "hard", ids: [c.id] })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="destructive" disabled={busy}
                          onClick={() => setConfirm({ mode: "soft", ids: [c.id] })}>
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button size="sm" variant="outline" disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</Button>
              <span className="text-xs text-muted-foreground">Page {page + 1}</span>
              <Button size="sm" variant="outline" disabled={rows.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}>Next →</Button>
            </div>
          </>
        )}
      </main>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.mode === "hard" ? "Permanently delete channel?" : "Remove channel from Heartify?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.mode === "hard"
                ? `This permanently deletes ${confirm.ids.length} channel record(s) and cannot be undone. Followers, trust profiles, and audit entries linked to it will be released.`
                : `Removed channels stop appearing in feeds, search, and recommendations. You can restore them later from the "Removed" tab.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                const ids = confirm.ids;
                const mode = confirm.mode;
                setConfirm(null);
                if (mode === "hard") void hardDelete(ids);
                else void softRemove(ids);
              }}
            >
              {confirm?.mode === "hard" ? "Delete forever" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminApprovedChannels;
