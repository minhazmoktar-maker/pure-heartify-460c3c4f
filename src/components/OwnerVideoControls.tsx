import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Crown,
  Trash2,
  RotateCcw,
  EyeOff,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Ban,
  ListX,
} from "lucide-react";
import { toast } from "sonner";
import { logPrivilegedAction } from "@/lib/auditLog";

/**
 * Owner-only moderation controls attached to a video.
 * Visibility is UI convenience only — RLS on the backend enforces authority.
 */
export function OwnerVideoControls({
  videoId,
  title,
  channelTitle,
}: {
  videoId: string;
  title?: string;
  channelTitle?: string;
}) {
  const { user } = useAuth();
  const { isOwner, isAdmin, loading } = useRole();
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (!user || (!isOwner && !isAdmin)) return;
    supabase
      .from("removed_videos")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle()
      .then(({ data }) => setRemoved(!!data));
  }, [user, videoId, isOwner, isAdmin]);

  if (loading || !user || (!isOwner && !isAdmin)) return null;

  const run = async (
    label: string,
    action: string,
    fn: () => Promise<void>,
  ) => {
    try {
      await fn();
      await logPrivilegedAction({
        action,
        target_type: "video",
        target_id: videoId,
        new_state: { title, channelTitle },
      });
      toast.success(label);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed";
      toast.error(msg);
    }
  };

  const deleteVideo = () =>
    run("Video deleted from platform", "video.delete", async () => {
      const reason =
        window.prompt("Reason for removal?", "Inappropriate content") ??
        "Owner action";
      const { error: insErr } = await supabase.from("removed_videos").insert({
        video_id: videoId,
        reason,
        removed_by: user!.id,
      });
      if (insErr && !insErr.message.includes("duplicate")) throw insErr;
      await supabase.from("curated_videos").delete().eq("video_id", videoId);
      setRemoved(true);
    });

  const restoreVideo = () =>
    run("Video restored", "video.restore", async () => {
      const { error } = await supabase
        .from("removed_videos")
        .delete()
        .eq("video_id", videoId);
      if (error) throw error;
      setRemoved(false);
    });

  const hideFromSurface = (surface: string) => () =>
    run(`Removed from ${surface}`, `video.remove_from.${surface}`, async () => {
      // Removal from curated feeds — the row is removed; ingest guard keeps
      // it out until the blocklist entry is cleared.
      await supabase.from("curated_videos").delete().eq("video_id", videoId);
    });

  const banChannel = () =>
    run("Channel blocked", "channel.ban", async () => {
      if (!channelTitle) throw new Error("Channel title unavailable");
      const { error } = await supabase.from("blocked_creators").insert({
        pattern: channelTitle.toLowerCase(),
        reason: "Owner ban",
      });
      if (error && !error.message.includes("duplicate")) throw error;
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant={isOwner ? "default" : "outline"}
          className="gap-1.5"
        >
          {isOwner ? (
            <Crown className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {isOwner ? "Owner controls" : "Moderate"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          {isOwner ? "Owner actions" : "Admin actions"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {removed ? (
          <DropdownMenuItem onClick={restoreVideo}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restore video
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={deleteVideo} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete video
          </DropdownMenuItem>
        )}

        {isOwner && (
          <>
            <DropdownMenuItem onClick={hideFromSurface("homepage")}>
              <EyeOff className="mr-2 h-4 w-4" /> Remove from homepage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={hideFromSurface("recommendations")}>
              <Eye className="mr-2 h-4 w-4" /> Remove from recommendations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={hideFromSurface("search")}>
              <ListX className="mr-2 h-4 w-4" /> Remove from search
            </DropdownMenuItem>
            <DropdownMenuItem onClick={hideFromSurface("trending")}>
              <Sparkles className="mr-2 h-4 w-4" /> Remove from trending
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                run("Marked safe", "video.mark_safe", async () => {
                  await supabase
                    .from("curated_videos")
                    .update({ halal_score: 95 })
                    .eq("video_id", videoId);
                })
              }
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> Mark safe (override AI)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run("Marked unsafe", "video.mark_unsafe", async () => {
                  await supabase
                    .from("curated_videos")
                    .update({ halal_score: 10 })
                    .eq("video_id", videoId);
                })
              }
            >
              <ShieldAlert className="mr-2 h-4 w-4" /> Mark unsafe (override AI)
            </DropdownMenuItem>
            {channelTitle && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={banChannel} className="text-destructive">
                  <Ban className="mr-2 h-4 w-4" /> Ban channel platform-wide
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
