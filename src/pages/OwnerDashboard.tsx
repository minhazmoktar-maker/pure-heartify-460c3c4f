import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Crown, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditRow {
  id: string;
  user_email: string | null;
  actor_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  new_state: unknown;
}

const OwnerDashboard = () => {
  const { isOwner, loading } = useRole();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [counts, setCounts] = useState({ removed: 0, blocked: 0, approved: 0 });

  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      setBusy(true);
      const [{ data: log }, removed, blocked, approved] = await Promise.all([
        supabase
          .from("privileged_actions_log" as never)
          .select(
            "id,user_email,actor_role,action,target_type,target_id,created_at,new_state",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("removed_videos").select("id", { count: "exact", head: true }),
        supabase.from("blocked_creators").select("id", { count: "exact", head: true }),
        supabase.from("approved_channels").select("id", { count: "exact", head: true }),
      ]);
      setRows((log as AuditRow[] | null) ?? []);
      setCounts({
        removed: removed.count ?? 0,
        blocked: blocked.count ?? 0,
        approved: approved.count ?? 0,
      });
      setBusy(false);
    })();
  }, [isOwner]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
              Owner Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Full platform oversight · audit trail · moderation controls
            </p>
          </div>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{counts.approved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Blocked creators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{counts.blocked}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Removed videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{counts.removed}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Privileged action log
              <Badge variant="secondary">Owner-only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {busy ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No privileged actions recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-2 pr-3">When</th>
                      <th className="pb-2 pr-3">Actor</th>
                      <th className="pb-2 pr-3">Role</th>
                      <th className="pb-2 pr-3">Action</th>
                      <th className="pb-2">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr key={r.id} className="align-top">
                        <td className="py-2 pr-3 text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3">{r.user_email ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline">{r.actor_role}</Badge>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {r.action}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {r.target_type ?? "—"}
                          {r.target_id ? ` · ${r.target_id.slice(0, 24)}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;
