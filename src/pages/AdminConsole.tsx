import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Ban, Plus, Trash2, Sparkles, History } from "lucide-react";
import EmptyState from "@/components/EmptyState";

const overrideTone = (action: string): string => {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("remove") || a.includes("ban") || a.includes("reject") || a.includes("revoke")) return "danger";
  if (a.includes("grant") || a.includes("approve") || a.includes("allow") || a.includes("unblock")) return "primary";
  if (a.includes("block") || a.includes("flag") || a.includes("warn")) return "warning";
  if (a.includes("promote") || a.includes("owner") || a.includes("admin")) return "gold";
  return "muted";
};
import { toast } from "@/components/ui/use-toast";
import { track } from "@/lib/analytics";
import { useRequireAdminMfa } from "@/hooks/useRequireAdminMfa";
import { useRole } from "@/hooks/useRole";
import SEO from "@/components/SEO";

interface BlockedRow { id: string; pattern: string; reason: string | null; created_at: string }
interface OverrideRow {
  id: string;
  action: string;
  target: string;
  reason: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const AdminConsole = () => {
  const { user } = useAuth();
  const mfaOk = useRequireAdminMfa();
  const { isAdmin, loading: roleLoading } = useRole();
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [newReason, setNewReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [b, o] = await Promise.all([
      supabase.from("blocked_creators").select("*").order("created_at", { ascending: false }),
      supabase.from("moderation_overrides").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (b.data) setBlocked(b.data as BlockedRow[]);
    if (o.data) setOverrides(o.data as OverrideRow[]);
  };

  useEffect(() => {
    if (isAdmin && mfaOk) reload();
  }, [isAdmin, mfaOk]);

  const addPattern = async () => {
    const p = newPattern.trim().toLowerCase();
    if (!p || !user) return;
    setBusy(true);
    const { error } = await supabase.from("blocked_creators").insert({
      pattern: p,
      reason: newReason.trim() || "manual admin block",
    });
    if (error) {
      toast({ title: "Couldn't block", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("moderation_overrides").insert({
        admin_id: user.id,
        action: "block_pattern",
        target: p,
        reason: newReason.trim() || null,
      });
      // Invalidate live caches: purge matching rows now so nothing stale surfaces.
      try { await supabase.rpc("nightly_reaudit_sweep"); } catch { /* best-effort cache invalidation */ }
      track("admin_pattern_blocked", { pattern: p });
      toast({ title: "Pattern blocked", description: `“${p}” added and existing matches purged.` });
      setNewPattern("");
      setNewReason("");
      reload();
    }
    setBusy(false);
  };

  const removePattern = async (row: BlockedRow) => {
    if (!user) return;
    if (!confirm(`Unblock pattern “${row.pattern}”? This is audit-logged.`)) return;
    setBusy(true);
    const reason = prompt("Reason for unblocking (required):") ?? "";
    if (!reason.trim()) { setBusy(false); return; }
    const { error } = await supabase.from("blocked_creators").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Couldn't unblock", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("moderation_overrides").insert({
        admin_id: user.id,
        action: "unblock_pattern",
        target: row.pattern,
        reason,
      });
      track("admin_pattern_unblocked", { pattern: row.pattern });
      toast({ title: "Pattern unblocked", description: row.pattern });
      reload();
    }
    setBusy(false);
  };

  const runSweep = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("nightly_reaudit_sweep");
    if (error) toast({ title: "Sweep failed", description: error.message, variant: "destructive" });
    else toast({ title: "Sweep complete", description: JSON.stringify(data) });
    reload();
    setBusy(false);
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <p className="mt-2 text-muted-foreground">
            <Link to="/login" className="text-primary underline">Log in</Link> as an admin.
          </p>
        </main>
      </div>
    );
  }

  if (!roleLoading && !isAdmin) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-muted-foreground">You don't have admin access.</p>
        </main>
      </div>
    );
  }

  if (!mfaOk) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Two-factor authentication required</h1>
          <p className="mt-2 text-muted-foreground">Verifying your session…</p>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Admin Console — Heartify" description="Unified admin console for Heartify moderators and owners." path="/admin" />
      <Navbar />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Moderation Console</h1>
            <p className="text-sm text-muted-foreground">
              Review blocked creators, run sweeps, and log fully-audited overrides.
            </p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin/moderation">
              <History className="mr-2 h-4 w-4" /> Rejection log
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin/audit">
              <Sparkles className="mr-2 h-4 w-4" /> Full audit
            </Link>
          </Button>
          <Button onClick={runSweep} disabled={busy} size="sm">
            Run sweep now
          </Button>
        </div>

        <section className="mb-8 rounded-xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Ban className="h-5 w-5 text-destructive" /> Blocked creators & patterns ({blocked.length})
          </h2>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Pattern (lowercased substring, e.g. 'mia yilin')"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              className="sm:flex-1"
            />
            <Input
              placeholder="Reason"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="sm:w-64"
            />
            <Button onClick={addPattern} disabled={busy || !newPattern.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Block
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-lg border">
            <table className="heartify-table w-full text-sm">
              <thead>
                <tr>
                  <th>Pattern</th>
                  <th>Reason</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((b) => (
                  <tr key={b.id} tabIndex={0}>
                    <td className="font-mono text-xs">{b.pattern}</td>
                    <td className="text-muted-foreground">{b.reason ?? "—"}</td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePattern(b)}
                        disabled={busy}
                        aria-label={`Unblock ${b.pattern}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {blocked.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <EmptyState
                        icon={Ban}
                        title="No blocked patterns"
                        description="Add a channel handle or keyword pattern above to block it from ever surfacing."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>



        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5 text-primary" /> Audit trail ({overrides.length})
          </h2>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{o.action}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{o.target}</td>
                    <td className="px-3 py-2 text-muted-foreground">{o.reason ?? "—"}</td>
                  </tr>
                ))}
                {overrides.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No overrides yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminConsole;
