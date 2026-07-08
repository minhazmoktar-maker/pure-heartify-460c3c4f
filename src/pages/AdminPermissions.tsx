import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, XCircle, Shield, EyeOff, Eye } from "lucide-react";
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type Role } from "@/lib/permissions";

// Permission → routes + component files it gates. Manual mapping for the tester UI.
const PERMISSION_GATES: Record<Permission, { routes: string[]; files: string[] }> = {
  delete_video:            { routes: ["/watch/:id"],           files: ["src/pages/Watch.tsx"] },
  restore_video:           { routes: ["/admin/removed"],       files: ["src/pages/AdminRemoved.tsx"] },
  hide_video:              { routes: ["/admin/review"],        files: ["src/components/admin/VideoRow.tsx"] },
  unhide_video:            { routes: ["/admin/review"],        files: ["src/components/admin/VideoRow.tsx"] },
  archive_video:           { routes: ["/admin/review"],        files: ["src/pages/AdminReview.tsx"] },
  unarchive_video:         { routes: ["/admin/review"],        files: ["src/pages/AdminReview.tsx"] },
  feature_video:           { routes: ["/admin/curated"],       files: ["src/pages/AdminCurated.tsx"] },
  pin_video:               { routes: ["/admin/curated"],       files: ["src/pages/AdminCurated.tsx"] },
  edit_video_metadata:     { routes: ["/admin/review"],        files: ["src/pages/AdminReview.tsx"] },
  edit_halal_score:        { routes: ["/admin/review"],        files: ["src/pages/AdminReview.tsx"] },
  override_ai_decision:    { routes: ["/admin/review"],        files: ["src/pages/AdminReview.tsx"] },
  approve_content:         { routes: ["/admin/review"],        files: ["src/pages/AdminReview.tsx"] },
  reject_content:          { routes: ["/admin/review"],        files: ["src/pages/AdminReview.tsx"] },
  remove_from_surface:     { routes: ["/admin/curated"],       files: ["src/pages/AdminCurated.tsx"] },
  manage_channels:         { routes: ["/channels","/admin/channels"], files: ["src/pages/AdminChannels.tsx"] },
  ban_channel:             { routes: ["/admin/channel-trust"], files: ["src/pages/AdminChannelTrust.tsx"] },
  manage_categories:       { routes: ["/admin"],               files: ["src/pages/AdminCategories.tsx"] },
  manage_tags:             { routes: ["/admin"],               files: ["src/pages/AdminTags.tsx"] },
  manage_users:            { routes: ["/admin/roles"],         files: ["src/pages/AdminRoles.tsx"] },
  manage_roles:            { routes: ["/admin/roles"],         files: ["src/pages/AdminRoles.tsx"] },
  manage_owners:           { routes: ["/admin/roles"],         files: ["src/pages/AdminRoles.tsx"] },
  manage_platform_settings:{ routes: ["/owner","/admin/gsc"],  files: ["src/pages/Owner.tsx","src/pages/AdminGsc.tsx"] },
  manage_feature_flags:    { routes: ["/owner"],               files: ["src/pages/Owner.tsx"] },
  manage_api_keys:         { routes: ["/owner"],               files: ["src/pages/Owner.tsx"] },
  access_admin_dashboard:  { routes: ["/admin/*"],             files: ["src/pages/Admin.tsx"] },
  access_owner_dashboard:  { routes: ["/owner"],               files: ["src/pages/Owner.tsx"] },
  view_analytics:          { routes: ["/admin/analytics"],     files: ["src/pages/AdminAnalytics.tsx"] },
  view_audit_logs:         { routes: ["/admin/roles"],         files: ["src/pages/AdminRoles.tsx"] },
  view_moderation_history: { routes: ["/admin/moderation"],    files: ["src/pages/AdminModeration.tsx"] },
  moderate_reports:        { routes: ["/admin/reports"],       files: ["src/pages/AdminReports.tsx"] },
};

const CATEGORIES: Array<{ label: string; keys: Permission[] }> = [
  { label: "Video lifecycle", keys: ["delete_video","restore_video","hide_video","unhide_video","archive_video","unarchive_video","feature_video","pin_video","edit_video_metadata","edit_halal_score","override_ai_decision","approve_content","reject_content","remove_from_surface"] },
  { label: "Channels & taxonomy", keys: ["manage_channels","ban_channel","manage_categories","manage_tags"] },
  { label: "Users & roles", keys: ["manage_users","manage_roles","manage_owners"] },
  { label: "Platform", keys: ["manage_platform_settings","manage_feature_flags","manage_api_keys"] },
  { label: "Dashboards", keys: ["access_admin_dashboard","access_owner_dashboard"] },
  { label: "Observability", keys: ["view_analytics","view_audit_logs","view_moderation_history","moderate_reports"] },
];

export default function AdminPermissions() {
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, tier, isAdmin } = useRole();
  const [simulate, setSimulate] = useState<Set<Permission>>(new Set());
  const [simulateEnabled, setSimulateEnabled] = useState(false);

  const currentRole: Role = tier === "owner" ? "owner" : tier === "admin" ? "admin" : tier === "moderator" ? "moderator" : "user";
  const baseHeld = ROLE_PERMISSIONS[currentRole];
  const held = useMemo(() => {
    if (!simulateEnabled) return baseHeld;
    const next = new Set(baseHeld);
    simulate.forEach(p => next.delete(p));
    return next;
  }, [baseHeld, simulate, simulateEnabled]);

  const missing = useMemo(() => PERMISSIONS.filter(p => !held.has(p)), [held]);
  const grantedCount = PERMISSIONS.length - missing.length;

  const toggleSim = (p: Permission) => {
    const next = new Set(simulate);
    next.has(p) ? next.delete(p) : next.add(p);
    setSimulate(next);
  };

  if (authLoading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Permission tester · Heartify" description="Preview what your current role can access and see missing permissions." path="/admin/permissions" />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Permission tester</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <b className="text-foreground">{user.email}</b> ·
              {" "}<Badge className="ml-1">{currentRole}</Badge> · {grantedCount}/{PERMISSIONS.length} granted
              {simulateEnabled && simulate.size > 0 && <> · <Badge variant="destructive">simulating {simulate.size} missing</Badge></>}
            </p>
          </div>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {simulateEnabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Simulate missing permission
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Client-only preview — toggle permissions off to see how each surface would render for a lower tier.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {simulate.size > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setSimulate(new Set())}>Clear</Button>
              )}
              <Switch checked={simulateEnabled} onCheckedChange={setSimulateEnabled} />
            </div>
          </CardHeader>
        </Card>

        {CATEGORIES.map(g => (
          <Card key={g.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{g.label}</CardTitle>
              <Badge variant="outline">{g.keys.filter(k => held.has(k)).length}/{g.keys.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              {g.keys.map(k => {
                const has = held.has(k);
                const simulated = simulateEnabled && simulate.has(k);
                const gate = PERMISSION_GATES[k];
                return (
                  <div key={k} className="flex items-start justify-between rounded border p-2 text-sm gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      {has
                        ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                      <div className="min-w-0">
                        <div className="font-mono text-xs">{k}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          <span className="font-medium">routes:</span> {gate.routes.join(", ")}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          <span className="font-medium">files:</span> {gate.files.join(", ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={has ? "secondary" : "destructive"}>{simulated ? "simulated missing" : has ? "granted" : "missing"}</Badge>
                      {simulateEnabled && baseHeld.has(k) && (
                        <Button size="sm" variant={simulated ? "destructive" : "outline"} onClick={() => toggleSim(k)}>
                          {simulated ? "restore" : "hide"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {missing.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base text-destructive">Missing permissions ({missing.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {missing.map(m => <Badge key={m} variant="destructive" className="font-mono">{m}</Badge>)}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                To unlock these on the real account, ask an owner to promote you in <b>/admin/roles</b>.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
