import { useEffect, useState } from "react";
import { ThumbsDown, MoreVertical, Info, Trash2, Shield, ShieldOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNegativeFeedback, type NegativeReason } from "@/hooks/useNegativeFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Props {
  videoId: string;
  compact?: boolean;
}

const REASONS: { key: NegativeReason; label: string }[] = [
  { key: "not_interested", label: "Not interested" },
  { key: "already_watched", label: "Already watched" },
  { key: "dislike", label: "Don't like this" },
  { key: "offensive", label: "Feels inappropriate" },
];

export default function NotInterestedMenu({ videoId, compact }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { notInterested } = useNegativeFeedback();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [whyOpen, setWhyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);

  // Cached per-session: single query shared across every video card.
  const { data: isAdmin = false } = useQuery({
    queryKey: ["is_admin", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });

  // Only check per-video removal state when menu is open AND admin.
  const { data: platformRemoved = false } = useQuery({
    queryKey: ["removed_video", videoId],
    enabled: !!user && isAdmin && menuOpen,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("removed_videos").select("id").eq("video_id", videoId).maybeSingle();
      return !!data;
    },
  });

  const removeFromPlatform = async () => {
    if (!user || !isAdmin) return;
    setAdminBusy(true);
    try {
      if (platformRemoved) {
        const { error } = await supabase.from("removed_videos").delete().eq("video_id", videoId);
        if (error) throw error;
        setPlatformRemoved(false);
        toast({ title: "Video restored to platform" });
      } else {
        const reason = window.prompt("Reason for removing this video?", "Inappropriate content") ?? "Inappropriate content";
        const { error } = await supabase.from("removed_videos").insert({
          video_id: videoId, reason, removed_by: user.id,
        });
        if (error) throw error;
        await supabase.from("curated_videos").delete().eq("video_id", videoId);
        setPlatformRemoved(true);
        toast({ title: "Removed from the platform" });
      }
      qc.invalidateQueries({ queryKey: ["for_you"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again";
      toast({ title: "Action failed", description: msg, variant: "destructive" });
    } finally {
      setAdminBusy(false);
    }
  };

  const removeFromAccount = async () => {
    if (!user) return nav("/login");
    try {
      await Promise.all([
        supabase.from("watch_history").delete().eq("user_id", user.id).eq("video_id", videoId),
        supabase.from("favorites").delete().eq("user_id", user.id).eq("video_id", videoId),
        supabase.from("user_hidden_videos").upsert(
          { user_id: user.id, video_id: videoId, reason: "not_interested" as NegativeReason },
          { onConflict: "user_id,video_id" },
        ),
      ]);
      qc.invalidateQueries({ queryKey: ["watch_history"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["hidden_videos"] });
      qc.invalidateQueries({ queryKey: ["for_you"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      toast({ title: "Removed from your account" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again";
      toast({ title: "Could not remove", description: msg, variant: "destructive" });
    }
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Feedback on this video"
            className={
              compact
                ? "rounded-pill p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                : "inline-flex items-center gap-1 rounded-pill border border-border px-3 py-1 text-micro font-medium transition-colors hover:bg-accent"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {compact ? <MoreVertical className="h-4 w-4" /> : (<><ThumbsDown className="h-3.5 w-3.5" /> Not interested</>)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Show less like this</DropdownMenuLabel>
          {REASONS.map((r) => (
            <DropdownMenuItem
              key={r.key}
              onClick={(e) => {
                e.stopPropagation();
                if (!user) return nav("/login");
                notInterested.mutate({ videoId, reason: r.key });
              }}
            >
              {r.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              removeFromAccount();
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Remove from my account
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Admin</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={adminBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromPlatform();
                }}
                className={platformRemoved ? "" : "text-destructive focus:text-destructive"}
              >
                {platformRemoved ? (
                  <><ShieldOff className="mr-2 h-4 w-4" /> Restore to platform</>
                ) : (
                  <><Shield className="mr-2 h-4 w-4" /> Remove from platform</>
                )}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setWhyOpen(true);
            }}
          >
            <Info className="mr-2 h-4 w-4" /> Why am I seeing this?
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={whyOpen} onOpenChange={setWhyOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Why you're seeing this</DialogTitle>
            <DialogDescription>
              Heartify's recommendations are transparent by design.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm text-foreground">
            <li><strong>Human-approved channel.</strong> Every channel is reviewed against strict halal standards before its videos appear.</li>
            <li><strong>Matches your interests.</strong> Topics, reciters, and languages you follow or watch shape what we surface — not raw watch time.</li>
            <li><strong>Diverse &amp; fresh.</strong> We cap how often any one channel or topic repeats, so your feed stays balanced.</li>
            <li><strong>Zero engagement bait.</strong> No music, no inappropriate imagery — ever.</li>
          </ul>
          <p className="pt-2 text-micro text-muted-foreground">
            Use <em>Not interested</em> to teach the feed what you don't want.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
