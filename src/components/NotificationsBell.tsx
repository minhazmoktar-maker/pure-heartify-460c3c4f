import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ShieldAlert, CheckCircle2, XCircle, Loader2, Inbox, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useNotifications } from "@/hooks/useNotifications";
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
  const notif = useNotifications();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem("notif:last_seen") ?? 0);
  });

  // Perf: React Query caches these across every route change; previously each
  // navigation re-fired both the report list and the admin queue count.
  const reportsKey = ["notif-reports", user?.id ?? "anon"] as const;
  const reportsQuery = useQuery({
    queryKey: reportsKey,
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<UserReport[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from("video_reports")
        .select("id, video_id, status, created_at, updated_at, resolution")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(10);
      return (data ?? []) as UserReport[];
    },
  });
  const myReports = reportsQuery.data ?? [];

  const pendingKey = ["notif-pending-reports"] as const;
  const pendingQuery = useQuery({
    queryKey: pendingKey,
    enabled: !!user && isAdmin,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("video_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });
  const pendingReports = pendingQuery.data ?? 0;
  const loading = reportsQuery.isLoading || pendingQuery.isLoading;

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_reports", filter: `user_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: reportsKey });
          if (isAdmin) void qc.invalidateQueries({ queryKey: pendingKey });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);

  // Count what's "new" since last opened.
  const resolvedItems = myReports.filter((r) => r.status !== "pending");
  const newResolved = resolvedItems.filter(
    (r) => new Date(r.updated_at ?? r.created_at).getTime() > lastSeen,
  ).length;
  const unread = newResolved + (isAdmin ? pendingReports : 0) + notif.unread;

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
          className="tap-target animate-press relative inline-flex items-center justify-center rounded-pill transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={unread > 0 ? `Notifications (${unread} new)` : "Notifications"}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-pill bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
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
                    <p className="text-micro text-muted-foreground">
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
                    <p className="text-micro text-muted-foreground">Open the moderation queue →</p>
                  </div>
                </Link>
              )}

              {/* Server-side in-app notifications (streaks, referrals, khatm, badges) */}
              {notif.items.map((n) => {
                const ctaUrl = (n.data?.cta_url as string) || (n.data?.url as string) || "";
                const ctaLabel = (n.data?.cta_label as string) || "Open";
                const Wrapper: any = ctaUrl ? Link : "button";
                const wrapperProps: any = ctaUrl
                  ? { to: ctaUrl }
                  : { type: "button" };
                return (
                  <Wrapper
                    key={n.id}
                    {...wrapperProps}
                    onClick={() => {
                      void notif.markRead(n.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/50 ${
                      n.read_at ? "" : "bg-primary/5"
                    }`}
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-micro text-muted-foreground">{n.body}</p>}
                      {ctaUrl && (
                        <p className="mt-1 text-micro font-semibold text-primary">
                          {ctaLabel} →
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Wrapper>
                );
              })}


              {/* My reports */}
              {myReports.length === 0 && notif.items.length === 0 && !isAdmin && (
                <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-40" />
                  <p className="text-micro">You're all caught up.</p>
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
                      <p className="truncate text-micro text-muted-foreground">
                        {r.resolution ?? `Video ${r.video_id}`}
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

        <div className="flex items-center justify-between border-t px-4 py-2">
          {notif.unread > 0 ? (
            <button
              onClick={() => void notif.markAllRead()}
              className="text-micro font-semibold text-primary hover:underline"
            >
              Mark all read
            </button>
          ) : (
            <span />
          )}
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="text-micro font-semibold text-primary hover:underline"
          >
            Manage preferences
          </Link>
        </div>

      </PopoverContent>
    </Popover>
  );
}
