import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Crown, ShieldOff, Search, ArrowLeft, AlertTriangle } from "lucide-react";
import SEO from "@/components/SEO";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Row {
  id: string;
  user_id: string;
  plan: string;
  expires_at: string | null;
  updated_at: string;
  display_name?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_PLANS = ["premium", "premium_trial", "premium_lifetime", "free"] as const;

export default function AdminEntitlements({ embedded = false }: { embedded?: boolean } = {}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Grant form
  const [targetId, setTargetId] = useState("");
  const [plan, setPlan] = useState<(typeof VALID_PLANS)[number]>("premium");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");

  // Confirmation dialogs
  const [grantConfirmOpen, setGrantConfirmOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
        .from("profiles").select("user_id, display_name").in("user_id", ids);
      profiles = Object.fromEntries((profs ?? []).map((p) => [p.user_id, p]));
    }
    setRows((ents ?? []).map((e) => ({ ...e, display_name: profiles[e.user_id]?.display_name ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ----- Validation for grant form ---------------------------------------
  const targetIdError = useMemo(() => {
    const v = targetId.trim();
    if (!v) return null;
    if (!UUID_RE.test(v)) return "Not a valid user id (uuid).";
    return null;
  }, [targetId]);

  const expiresAtError = useMemo(() => {
    if (!expiresAt) return null;
    const t = new Date(expiresAt).getTime();
    if (Number.isNaN(t)) return "Invalid date.";
    if (plan === "premium_lifetime") return "Lifetime plans must have no expiry.";
    if (plan === "free") return "Free plans cannot have a future expiry.";
    if (t <= Date.now()) return "Expiry must be in the future.";
    return null;
  }, [expiresAt, plan]);

  const existingForTarget = useMemo(
    () => rows.find((r) => r.user_id === targetId.trim()),
    [rows, targetId],
  );

  const canGrant =
    UUID_RE.test(targetId.trim()) &&
    !expiresAtError &&
    reason.trim().length >= 3;

  // ----- Actions ---------------------------------------------------------
  const openGrantConfirm = () => {
    if (!canGrant) {
      toast.error("Fix validation errors first", {
        description: targetIdError || expiresAtError || "Reason must be at least 3 characters.",
      });
      return;
    }
    setGrantConfirmOpen(true);
  };

  const grant = async () => {
    setGrantConfirmOpen(false);
    setBusy("grant");
    const effectiveExpiry = plan === "premium_lifetime" ? null : (expiresAt ? new Date(expiresAt).toISOString() : null);
    const { error } = await supabase.rpc("grant_entitlement", {
      _user_id: targetId.trim(),
      _plan: plan,
      _expires_at: effectiveExpiry,
      _features: {},
      _reason: reason.trim(),
    });
    setBusy(null);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("foreign key") || msg.includes("violates") || msg.includes("not present")) {
        toast.error("Unknown user id", { description: "No auth user exists with that uuid." });
      } else if (msg.includes("forbidden")) {
        toast.error("Not authorised", { description: "Only owners and admins can grant entitlements." });
      } else {
        toast.error("Grant failed", { description: error.message });
      }
      return;
    }
    toast.success(existingForTarget ? "Entitlement updated" : "Entitlement granted");
    setTargetId(""); setReason(""); setExpiresAt("");
    void load();
  };

  const revoke = async () => {
    const target = revokeTarget;
    if (!target) return;
    setRevokeTarget(null);
    setBusy(target.user_id);
    const { error } = await supabase.rpc("revoke_entitlement", {
      _user_id: target.user_id,
      _reason: `Revoked via admin console for ${target.display_name ?? target.user_id}`,
    });
    setBusy(null);
    if (error) { toast.error("Revoke failed", { description: error.message }); return; }
    toast.success("Entitlement revoked");
    void load();
  };

  const visible = rows.filter((r) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return r.user_id.toLowerCase().includes(needle)
      || (r.display_name ?? "").toLowerCase().includes(needle)
      || r.plan.toLowerCase().includes(needle);
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Entitlements · Admin" description="Manage premium entitlements" path="/admin/entitlements" />
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
            <div>
              <input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="User ID (uuid)"
                aria-invalid={!!targetIdError}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              {targetIdError && <p className="mt-1 text-xs text-destructive">{targetIdError}</p>}
              {!targetIdError && existingForTarget && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Existing plan: <span className="font-semibold">{existingForTarget.plan}</span>
                  {existingForTarget.expires_at
                    ? ` — expires ${new Date(existingForTarget.expires_at).toLocaleString()}`
                    : " — no expiry"}
                </p>
              )}
            </div>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as (typeof VALID_PLANS)[number])}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {VALID_PLANS.map((p) => (
                <option key={p} value={p}>{p}{p === "free" ? " (downgrade)" : ""}</option>
              ))}
            </select>
            <div>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={plan === "premium_lifetime" || plan === "free"}
                aria-invalid={!!expiresAtError}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
              {expiresAtError
                ? <p className="mt-1 text-xs text-destructive">{expiresAtError}</p>
                : <p className="mt-1 text-xs text-muted-foreground">Leave empty for open-ended access.</p>}
            </div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (audit log, min 3 chars)"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              maxLength={280}
            />
          </div>
          <button
            onClick={openGrantConfirm}
            disabled={busy === "grant" || !canGrant}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy === "grant" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            {existingForTarget ? "Update entitlement" : "Grant entitlement"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            All grants and revocations are written to <code>privileged_actions_log</code>.
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
            <div className="p-8 text-center text-sm text-muted-foreground">
              {rows.length === 0 ? "No entitlements yet. Grant the first one above." : "No entitlements match your filter."}
            </div>
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
                            onClick={() => setRevokeTarget(r)}
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

      {/* Grant confirmation */}
      <AlertDialog open={grantConfirmOpen} onOpenChange={setGrantConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {existingForTarget ? "Update this entitlement?" : "Grant this entitlement?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">User:</span> <span className="font-mono">{targetId.trim()}</span></div>
                <div><span className="text-muted-foreground">Plan:</span> <span className="font-semibold">{plan}</span></div>
                <div>
                  <span className="text-muted-foreground">Expires:</span>{" "}
                  {plan === "premium_lifetime" || !expiresAt ? "never" : new Date(expiresAt).toLocaleString()}
                </div>
                {existingForTarget && (
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-xs">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>
                      This overwrites the existing <strong>{existingForTarget.plan}</strong> entitlement
                      {existingForTarget.expires_at
                        ? ` (previously expiring ${new Date(existingForTarget.expires_at).toLocaleString()})`
                        : " (previously with no expiry)"}.
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={grant}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke premium?</AlertDialogTitle>
            <AlertDialogDescription>
              This immediately downgrades <strong>{revokeTarget?.display_name ?? revokeTarget?.user_id}</strong> to
              the free plan. They will lose access to premium-only content on their next request. The action is
              logged to <code>privileged_actions_log</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
