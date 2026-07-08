import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type Role } from "@/lib/permissions";

// Permission → route(s)/surface it unlocks. Manual mapping for the tester UI.
const PERMISSION_SURFACES: Record<Permission, string[]> = {
  delete_video: ["Watch page delete button"],
  restore_video: ["Admin → Removed videos"],
  hide_video: ["Video row hide"],
  unhide_video: ["Video row unhide"],
  archive_video: ["Admin → Review"],
  unarchive_video: ["Admin → Review"],
  feature_video: ["Curated sections"],
  pin_video: ["Curated sections"],
  edit_video_metadata: ["/admin/review"],
  edit_halal_score: ["/admin/review"],
  override_ai_decision: ["/admin/review"],
  approve_content: ["/admin/review"],
  reject_content: ["/admin/review"],
  remove_from_surface: ["Curated section admin"],
  manage_channels: ["/channels"],
  ban_channel: ["/admin/channel-trust"],
  manage_categories: ["Admin console"],
  manage_tags: ["Admin console"],
  manage_users: ["/admin/roles"],
  manage_roles: ["/admin/roles"],
  manage_owners: ["/admin/roles (owner tier)"],
  manage_platform_settings: ["/owner", "/admin/gsc"],
  manage_feature_flags: ["/owner"],
  manage_api_keys: ["/owner"],
  access_admin_dashboard: ["/admin/*"],
  access_owner_dashboard: ["/owner"],
  view_analytics: ["/admin/analytics"],
  view_audit_logs: ["/admin/roles → Audit"],
  view_moderation_history: ["/admin/moderation"],
  moderate_reports: ["/admin/reports"],
};

const CATEGORIES: Array<{ label: string; keys: Permission[] }> = [
  {
    label: "Video lifecycle",
    keys: ["delete_video", "restore_video", "hide_video", "unhide_video", "archive_video", "unarchive_video", "feature_video", "pin_video", "edit_video_metadata", "edit_halal_score", "override_ai_decision", "approve_content", "reject_content", "remove_from_surface"],
  },
  { label: "Channels & taxonomy", keys: ["manage_channels", "ban_channel", "manage_categories", "manage_tags"] },
  { label: "Users & roles", keys: ["manage_users", "manage_roles", "manage_owners"] },
  { label: "Platform", keys: ["manage_platform_settings", "manage_feature_flags", "manage_api_keys"] },
  { label: "Dashboards", keys: ["access_admin_dashboard", "access_owner_dashboard"] },
  { label: "Observability", keys: ["view_analytics", "view_audit_logs", "view_moderation_history", "moderate_reports"] },
];

export default function AdminPermissions() {
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, tier, isAdmin } = useRole();

  // Owner tier from useRole isn't part of ROLE_PERMISSIONS (owner has all perms).
  const currentRole: Role = tier === "owner" ? "owner" : tier === "admin" ? "admin" : tier === "moderator" ? "moderator" : "user";
  const held = ROLE_PERMISSIONS[currentRole];

  const groups = useMemo(() => CATEGORIES.map(g => ({
    ...g,
    granted: g.keys.filter(k => held.has(k)).length,
    total: g.keys.length,
  })), [held]);

  const missing = useMemo(() => PERMISSIONS.filter(p => !held.has(p)), [held]);
  const grantedCount = PERMISSIONS.length - missing.length;

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
              You are signed in as <b className="text-foreground">{user.email}</b> with role
              {" "}<Badge className="ml-1">{currentRole}</Badge>. {grantedCount}/{PERMISSIONS.length} permissions granted.
            </p>
          </div>
        </header>

        {CATEGORIES.map(g => (
          <Card key={g.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{g.label}</CardTitle>
              <Badge variant="outline">{g.keys.filter(k => held.has(k)).length}/{g.keys.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              {g.keys.map(k => {
                const has = held.has(k);
                return (
                  <div key={k} className="flex items-start justify-between rounded border p-2 text-sm">
                    <div className="flex items-start gap-2">
                      {has
                        ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        : <XCircle className="h-4 w-4 text-destructive mt-0.5" />}
                      <div>
                        <div className="font-mono text-xs">{k}</div>
                        <div className="text-xs text-muted-foreground">{PERMISSION_SURFACES[k].join(" · ")}</div>
                      </div>
                    </div>
                    <Badge variant={has ? "secondary" : "destructive"}>{has ? "granted" : "missing"}</Badge>
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
                To unlock these, ask an owner to promote your account in <b>/admin/roles</b>.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
