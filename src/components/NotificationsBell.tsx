import { useEffect, useState, useCallback } from "react";
import { Bell, ShieldAlert, CheckCircle2, XCircle, Loader2, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlement } from "@/hooks/useEntitlement";
import { formatDistanceToNow } from "date-fns";

interface UserReport {
  id: string;
  video_id: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  resolution: string | null;
}

interface Props { isAdmin: boolean }

export default function NotificationsBell({ isAdmin }: Props) {
  const { user } = useAuth();
  const { entitlement, isPremium } = useEntitlement();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);
  const [myReports, setMyReports] = useState<UserReport[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem("notif:last_seen") ?? 0);
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // 1. My recent reports (any status).
    const { data: mine } = await supabase
      .from("video_reports")
      .select("id, video_id, status, created_at, updated_at, resolution_note")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(10);
    setMyReports((mine ?? []) as UserReport[]);

    // 2. Admin queue depth.
    if (isAdmin) {
      const { count } = await supabase
        .from("video_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingReports(count ?? 0);
    }
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user) return;
    void load();
    // Realtime: any change to my reports refreshes the list.
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_reports", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, load]);

  // Count what's "new" since last opened.
  const resolvedItems = myReports.filter((r) => r.status !== "pending");
  const newResolved = resolvedItems.filter(
    (r) => new Date(r.updated_at ?? r.created_at).getTime() > lastSeen,
  ).length;
  const unread = newResolved + (isAdmin ? pendingReports : 0);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      const now = Date.now();
      setLastSeen(now);
      try { window.localStorage.setItem("notif:last_seen", String(now)); } catch { /* noop */ }
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-full p-2 transition-colors hover:bg-secondary"
          aria-label={unread > 0 ? `Notifications (${unread} new)` : "Notifications"}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="divide-y">
              {/* Premium badge */}
              {isPremium && (
                <Link
                  to="/audio"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/50"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Premium is active</p>
                    <p className="text-xs text-muted-foreground">
                      Plan: {entitlement.plan}
                      {entitlement.expiresAt ? ` · until ${new Date(entitlement.expiresAt).toLocaleDateString()}` : " · no expiry"}
                    </p>
                  </div>
                </Link>
              )}

              {/* Admin: pending reports */}
              {isAdmin && pendingReports > 0 && (
                <Link
                  to="/admin/reports"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 bg-amber-500/5 px-4 py-3 hover:bg-amber-500/10"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {pendingReports} report{pendingReports === 1 ? "" : "s"} awaiting review
                    </p>
                    <p className="text-xs text-muted-foreground">Open the moderation queue →</p>
                  </div>
                </Link>
              )}

              {/* My reports */}
              {myReports.length === 0 && !isAdmin && (
                <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-40" />
                  <p className="text-xs">You're all caught up.</p>
                </div>
              )}
              {myReports.map((r) => {
                const isResolved = r.status !== "pending";
                const Icon = r.status === "resolved" ? CheckCircle2
                  : r.status === "rejected" ? XCircle
                  : Loader2;
                const tone = r.status === "resolved" ? "text-emerald-500"
                  : r.status === "rejected" ? "text-muted-foreground"
                  : "text-amber-500";
                return (
                  <Link
                    key={r.id}
                    to={`/watch/${r.video_id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/50"
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone} ${!isResolved ? "animate-spin" : ""}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        Your report was {r.status}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.resolution_note ?? `Video ${r.video_id}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.updated_at ?? r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 text-right">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Manage preferences
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
