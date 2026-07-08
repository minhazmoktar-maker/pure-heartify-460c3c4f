import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Clock, Bookmark, PlayCircle, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import ReferralCard from "@/components/ReferralCard";
import LanguageSettings from "@/components/LanguageSettings";
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

type ProfileTab = "profile" | "continue" | "favorites" | "history";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setAvatarUrl(data.avatar_url ?? "");
        }
        setProfileLoaded(true);
      });
  }, [user]);

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
      .update({ display_name: displayName, bio, avatar_url: avatarUrl })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
    }
  };

  if (authLoading || !profileLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <button
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

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
              <LanguageSettings />
            </div>

            <div className="pt-4">
              <ReferralCard />
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
