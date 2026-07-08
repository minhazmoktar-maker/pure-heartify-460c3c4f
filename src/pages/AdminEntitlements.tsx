import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Crown, ShieldOff, Search, ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";

interface Row {
  id: string;
  user_id: string;
  plan: string;
  expires_at: string | null;
  updated_at: string;
  email?: string | null;
  display_name?: string | null;
}

export default function AdminEntitlements() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Grant form state
  const [targetId, setTargetId] = useState("");
  const [plan, setPlan] = useState("premium");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    // Join manually: entitlements + profiles for display context.
    const { data: ents, error } = await supabase
      .from("entitlements")
      .select("id, user_id, plan, expires_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const ids = (ents ?? []).map((e) => e.user_id);
    let profiles: Record<string, { display_name?: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      profiles = Object.fromEntries((profs ?? []).map((p) => [p.user_id, p]));
    }
    setRows(
      (ents ?? []).map((e) => ({
        ...e,
        display_name: profiles[e.user_id]?.display_name ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const grant = async () => {
    if (!targetId.trim()) { toast.error("User ID required"); return; }
    setBusy("grant");
    const { error } = await supabase.rpc("grant_entitlement", {
      _user_id: targetId.trim(),
      _plan: plan,
      _expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      _features: {},
      _reason: reason || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Entitlement granted");
    setTargetId(""); setReason(""); setExpiresAt("");
    void load();
  };

  const revoke = async (userId: string) => {
    if (!confirm("Revoke premium for this user?")) return;
    setBusy(userId);
    const { error } = await supabase.rpc("revoke_entitlement", {
      _user_id: userId,
      _reason: "Admin revocation from console",
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Entitlement revoked");
    void load();
  };

  const visible = rows.filter((r) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      r.user_id.toLowerCase().includes(needle) ||
      (r.display_name ?? "").toLowerCase().includes(needle) ||
      r.plan.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Entitlements · Admin" description="Manage premium entitlements" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/admin/console" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Admin console
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <Crown className="h-6 w-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold">Entitlements</h1>
        </div>

        {/* Grant form */}
        <div className="mb-8 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Grant / update entitlement
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="User ID (uuid)"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="premium">premium</option>
              <option value="premium_trial">premium_trial</option>
              <option value="premium_lifetime">premium_lifetime</option>
              <option value="free">free (downgrade)</option>
            </select>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              placeholder="Expires at (optional)"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (audit log)"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={grant}
            disabled={busy === "grant"}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy === "grant" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            Grant entitlement
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Leave expires-at empty for open-ended access. All grants and revocations are written to privileged_actions_log.
          </p>
        </div>

        {/* Search */}
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by user id, name, or plan…"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border bg-card">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No entitlements match.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Expires</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const active = r.plan !== "free" && (!r.expires_at || new Date(r.expires_at) > new Date());
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.display_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.user_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          active ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"
                        }`}>
                          {active && <Crown className="h-3 w-3" />}
                          {r.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.expires_at ? new Date(r.expires_at).toLocaleString() : "never"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.updated_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {active && (
                          <button
                            onClick={() => revoke(r.user_id)}
                            disabled={busy === r.user_id}
                            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {busy === r.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
