import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Clock, Bookmark, PlayCircle, AlertTriangle, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import ReferralCard from "@/components/ReferralCard";
import HandleClaimCard from "@/components/HandleClaimCard";
import LanguageSettings from "@/components/LanguageSettings";
import MfaStatusCard from "@/components/MfaStatusCard";
import WeeklyRecapCard from "@/components/WeeklyRecapCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";

type ProfileTab = "profile" | "continue" | "favorites" | "history";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { favorites } = useFavorites();

  const [tab, setTab] = useState<ProfileTab>("profile");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: "DELETE" },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      toast({ title: "Account deleted", description: "Your account and personal data have been removed." });
      navigate("/", { replace: true });
    } catch (e: any) {
      toast({
        title: "Could not delete account",
        description: e?.message ?? "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteConfirm("");
    }
  };

  // Watch history
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Continue watching
  const [continueItems, setContinueItems] = useState<any[]>([]);
  const [continueLoading, setContinueLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (["profile", "continue", "favorites", "history"].includes(requested ?? "")) {
      setTab(requested as ProfileTab);
    }
  }, [searchParams]);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) {
          toast({ title: "Could not load profile", description: error.message, variant: "destructive" });
        }
        if (data) {
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setAvatarUrl(data.avatar_url ?? "");
        } else if (!error) {
          const fallbackName = user.user_metadata?.full_name ?? user.email ?? "";
          const { error: createError } = await supabase
            .from("profiles")
            .upsert({ user_id: user.id, display_name: fallbackName }, { onConflict: "user_id" });
          if (createError) {
            toast({ title: "Profile not found", description: createError.message, variant: "destructive" });
          } else {
            setDisplayName(fallbackName);
          }
        }
        setProfileLoaded(true);
      });
  }, [user, toast]);

  // Load history when tab changes
  useEffect(() => {
    if (tab !== "history" || !user) return;
    setHistoryLoading(true);
    supabase
      .from("watch_history")
      .select("*")
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setHistory(data ?? []);
        setHistoryLoading(false);
      });
  }, [tab, user]);

  // Load Continue Watching
  useEffect(() => {
    if (tab !== "continue" || !user) return;
    setContinueLoading(true);
    supabase
      .from("watch_history")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .gt("progress_seconds", 10)
      .order("watched_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setContinueItems(data ?? []);
        setContinueLoading(false);
      });
  }, [tab, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, display_name: displayName, bio, avatar_url: avatarUrl }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
    }
  };

  if (authLoading || !profileLoaded) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-12">
      <SEO title="Your Profile — Heartify" description="Manage your Heartify profile, streaks, offline library, MFA and language settings." path="/profile" />
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <button
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Quick links */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            to="/offline"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
            Offline downloads
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-6 overflow-x-auto">
          {([
            { key: "profile", label: "Profile", icon: Camera },
            { key: "continue", label: "Continue", icon: PlayCircle },
            { key: "favorites", label: "Bookmarks", icon: Bookmark },
            { key: "history", label: "History", icon: Clock },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Profile edit */}
        {tab === "profile" && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {avatarUrl ? (
                  <img src={avatarUrl} className="h-full w-full rounded-full object-cover" alt="avatar" />
                ) : (
                  displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Member since {new Date(user?.created_at ?? "").toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Avatar URL</label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Bio</label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>

            <div className="pt-4">
              <WeeklyRecapCard />
            </div>

            <div className="pt-4">
              <MfaStatusCard />
            </div>

            <div className="pt-4">
              <LanguageSettings />
            </div>

            <div className="pt-4">
              <HandleClaimCard />
            </div>

            <div className="pt-4">
              <ReferralCard />
            </div>

            {/* Danger zone — required by Apple App Store guideline 5.1.1(v). */}
            <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Delete account</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permanently removes your profile, favorites, watch history, playback progress,
                    device tokens, and search history. This cannot be undone.
                  </p>
                  <AlertDialog onOpenChange={(open) => !open && setDeleteConfirm("")}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="mt-3">
                        Delete my account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your Heartify account and all associated
                          personal data. Aggregated, anonymised analytics may be retained per our
                          privacy policy. This action cannot be reversed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">
                          Type <span className="font-mono">DELETE</span> to confirm
                        </label>
                        <Input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder="DELETE"
                          autoComplete="off"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deleteConfirm !== "DELETE" || deleting}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteAccount();
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Permanently delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continue Watching */}
        {tab === "continue" && (
          <div>
            {continueLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : continueItems.length === 0 ? (
              <EmptyState
                icon={PlayCircle}
                title="Nothing in progress"
                description="Videos you've started but not finished will appear here so you can pick up where you left off."
                actionLabel="Start your Daily Dose"
                actionHref="/"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {continueItems.map((h) => {
                  const pct =
                    h.duration_seconds && h.duration_seconds > 0
                      ? Math.min(100, Math.round((h.progress_seconds / h.duration_seconds) * 100))
                      : 0;
                  return (
                    <div
                      key={h.id}
                      onClick={() => navigate(`/watch/${h.video_id}`)}
                      className="flex gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-accent transition-colors"
                    >
                      {h.thumbnail_url && (
                        <div className="relative shrink-0">
                          <img src={h.thumbnail_url} className="h-20 w-32 rounded object-cover bg-muted" alt="" loading="lazy" decoding="async" />
                          {pct > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b bg-black/40">
                              <div className="h-full rounded-b bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-2">{h.video_title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{h.channel_title}</p>
                        {pct > 0 && (
                          <p className="text-xs text-primary mt-1">{pct}% watched</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bookmarks */}
        {tab === "favorites" && (
          <div>
            {favorites.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No bookmarks yet"
                description="Tap the bookmark icon on any video to save it for later — across devices."
                actionLabel="Explore content"
                actionHref="/"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    onClick={() => navigate(`/watch/${fav.video_id}`)}
                    className="flex gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-accent transition-colors"
                  >
                    {fav.thumbnail_url && (
                      <img src={fav.thumbnail_url} className="h-20 w-32 rounded object-cover shrink-0 bg-muted" alt="" loading="lazy" decoding="async" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-2">{fav.video_title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fav.channel_title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Watch history */}
        {tab === "history" && (
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No watch history yet"
                description="Once you start watching, your recent videos will show up here."
                actionLabel="Find something beneficial"
                actionHref="/search"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => navigate(`/watch/${h.video_id}`)}
                    className="flex gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-accent transition-colors"
                  >
                    {h.thumbnail_url && (
                      <img src={h.thumbnail_url} className="h-20 w-32 rounded object-cover shrink-0 bg-muted" alt="" loading="lazy" decoding="async" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-2">{h.video_title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(h.watched_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
