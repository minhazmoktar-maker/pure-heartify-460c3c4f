import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Users, ScrollText, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AppUser = { id: string; email: string; created_at: string; last_sign_in_at: string | null };
type RoleRow = { user_id: string; role: "admin" | "moderator" | "user" };
type OwnerRow = { user_id: string; email: string | null; notes: string | null; created_at: string };
type MfaFactor = { id: string; friendly_name?: string; factor_type: string; status: string; created_at: string };
type AuditRow = {
  id: string; user_email: string | null; actor_role: string; action: string;
  target_type: string | null; target_id: string | null; created_at: string;
  success: boolean; failure_reason: string | null; metadata: Record<string, unknown> | null;
};

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-roles", {
    body: { action, ...params },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export default function AdminRoles() {
  const { loading, isOwner } = useRole();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshAdmins = useCallback(async () => {
    const r = await call<{ roles: RoleRow[]; owners: OwnerRow[] }>("list_admins");
    setRoles(r.roles); setOwners(r.owners);
  }, []);

  const refreshUsers = useCallback(async (q = query) => {
    const r = await call<{ users: AppUser[] }>("list_users", { query: q });
    setUsers(r.users);
  }, [query]);

  const refreshAudit = useCallback(async () => {
    const r = await call<{ rows: AuditRow[] }>("list_audit", { limit: 200 });
    setAudit(r.rows);
  }, []);

  useEffect(() => {
    if (isOwner) {
      refreshUsers("");
      refreshAdmins();
      refreshAudit();
    }
  }, [isOwner, refreshUsers, refreshAdmins, refreshAudit]);

  const roleOf = (uid: string): string => {
    if (owners.some(o => o.user_id === uid)) return "owner";
    const r = roles.find(x => x.user_id === uid);
    return r?.role ?? "user";
  };

  const setUserRole = async (uid: string, target: "owner" | "admin" | "moderator" | "user", email?: string) => {
    setBusy(true);
    try {
      const current = roleOf(uid);
      // Clean existing user_roles rows for this user (admin/moderator)
      if (current === "admin") await call("revoke_role", { user_id: uid, role: "admin" });
      if (current === "moderator") await call("revoke_role", { user_id: uid, role: "moderator" });
      if (current === "owner" && target !== "owner") await call("revoke_owner", { user_id: uid });

      if (target === "owner") await call("grant_owner", { user_id: uid, email });
      else if (target === "admin") await call("assign_role", { user_id: uid, role: "admin" });
      else if (target === "moderator") await call("assign_role", { user_id: uid, role: "moderator" });
      // user: no-op after clean

      await refreshAdmins();
      await refreshAudit();
      toast({ title: "Role updated", description: `${email ?? uid.slice(0, 8)} → ${target}` });
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const loadFactors = async (u: AppUser) => {
    setSelectedUser(u);
    try {
      const r = await call<{ factors: MfaFactor[] }>("list_mfa", { user_id: u.id });
      setFactors(r.factors || []);
    } catch (e) {
      toast({ title: "MFA lookup failed", description: (e as Error).message, variant: "destructive" });
      setFactors([]);
    }
  };

  const removeFactor = async (factorId: string) => {
    if (!selectedUser) return;
    if (!confirm("Remove this MFA factor? The user will lose that method.")) return;
    try {
      await call("unenroll_mfa", { user_id: selectedUser.id, factor_id: factorId });
      await loadFactors(selectedUser);
      await refreshAudit();
      toast({ title: "Factor removed" });
    } catch (e) {
      toast({ title: "Remove failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Roles & Permissions · Heartify" description="Owner control panel for roles, MFA, and audit events." path="/admin/roles" />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground">Owner-only control panel for admin, owner, and MFA access.</p>
          </div>
        </header>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users & Roles</TabsTrigger>
            <TabsTrigger value="mfa"><ShieldCheck className="mr-2 h-4 w-4" />MFA</TabsTrigger>
            <TabsTrigger value="audit"><ScrollText className="mr-2 h-4 w-4" />Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Search users</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Filter by email…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && refreshUsers()}
                  />
                  <Button onClick={() => refreshUsers()} disabled={busy}>Search</Button>
                </div>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Current role</th>
                        <th className="px-3 py-2">Change to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => {
                        const cur = roleOf(u.id);
                        return (
                          <tr key={u.id} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                            <td className="px-3 py-2">
                              <Badge variant={cur === "owner" ? "default" : cur === "admin" ? "secondary" : "outline"}>{cur}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {(["owner", "admin", "moderator", "user"] as const).map(r => (
                                  <Button key={r} size="sm" variant={cur === r ? "default" : "outline"}
                                    disabled={busy || cur === r}
                                    onClick={() => setUserRole(u.id, r, u.email)}>
                                    {r}
                                  </Button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {users.length === 0 && (
                        <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No users.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mfa" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Manage MFA factors</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Select a user from the list below, then remove any stale factor.</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border max-h-64 overflow-auto">
                    {users.map(u => (
                      <button key={u.id}
                        onClick={() => loadFactors(u)}
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${selectedUser?.id === u.id ? "bg-muted" : ""}`}>
                        {u.email}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-md border p-3">
                    {!selectedUser && <p className="text-sm text-muted-foreground">Pick a user to see factors.</p>}
                    {selectedUser && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                        {factors.length === 0 && <p className="text-sm text-muted-foreground">No MFA factors enrolled.</p>}
                        {factors.map(f => (
                          <div key={f.id} className="flex items-center justify-between rounded border p-2">
                            <div className="text-xs">
                              <div className="font-medium">{f.friendly_name || f.factor_type}</div>
                              <div className="text-muted-foreground">{f.status} · {new Date(f.created_at).toLocaleDateString()}</div>
                            </div>
                            <Button size="sm" variant="destructive" onClick={() => removeFactor(f.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Privileged actions audit log</CardTitle>
                <Button size="sm" variant="outline" onClick={refreshAudit}>Refresh</Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-auto max-h-[600px]">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-left sticky top-0">
                      <tr>
                        <th className="px-3 py-2">When</th>
                        <th className="px-3 py-2">Actor</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Action</th>
                        <th className="px-3 py-2">Target</th>
                        <th className="px-3 py-2">OK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map(a => (
                        <tr key={a.id} className="border-t align-top">
                          <td className="px-3 py-2 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2">{a.user_email ?? "—"}</td>
                          <td className="px-3 py-2">{a.actor_role}</td>
                          <td className="px-3 py-2 font-mono">{a.action}</td>
                          <td className="px-3 py-2 font-mono">{a.target_type}:{a.target_id?.slice(0, 12) ?? "—"}</td>
                          <td className="px-3 py-2">{a.success ? "✓" : `✗ ${a.failure_reason ?? ""}`}</td>
                        </tr>
                      ))}
                      {audit.length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No audit events.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
