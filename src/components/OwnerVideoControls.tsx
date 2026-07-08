import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  Archive,
  ArchiveRestore,
  Star,
  StarOff,
  Pin,
  PinOff,
  Pencil,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { logPrivilegedAction } from "@/lib/auditLog";

interface VideoState {
  is_hidden: boolean;
  is_archived: boolean;
  is_featured: boolean;
  is_pinned: boolean;
  halal_score: number | null;
}

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
  const { can, canAny, principal, loading } = usePermissions();
  const isOwner = principal.role === "owner";
  const [removed, setRemoved] = useState(false);
  const [state, setState] = useState<VideoState | null>(null);

  // Any moderation surface — used to decide whether to render the trigger.
  const CONTROL_PERMISSIONS = [
    "delete_video",
    "restore_video",
    "hide_video",
    "archive_video",
    "feature_video",
    "pin_video",
    "edit_video_metadata",
    "edit_halal_score",
    "override_ai_decision",
    "remove_from_surface",
    "ban_channel",
  ] as const;

  useEffect(() => {
    if (!user || !canAny(CONTROL_PERMISSIONS)) return;
    supabase
      .from("removed_videos")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle()
      .then(({ data }) => setRemoved(!!data));
    supabase
      .from("curated_videos")
      .select("is_hidden,is_archived,is_featured,is_pinned,halal_score")
      .eq("video_id", videoId)
      .maybeSingle()
      .then(({ data }) => data && setState(data as VideoState));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, videoId, principal.role]);

  if (loading || !user || !canAny(CONTROL_PERMISSIONS)) return null;

  const run = async (
    label: string,
    action: string,
    fn: () => Promise<Partial<VideoState> | void>,
  ) => {
    const previous = state;
    try {
      const patch = (await fn()) ?? {};
      if (state) setState({ ...state, ...patch });
      await logPrivilegedAction({
        action,
        target_type: "video",
        target_id: videoId,
        previous_state: previous,
        new_state: { ...(previous ?? {}), ...patch, title, channelTitle },
        success: true,
      });
      toast.success(label);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed";
      await logPrivilegedAction({
        action,
        target_type: "video",
        target_id: videoId,
        success: false,
        failure_reason: msg,
      });
      toast.error(msg);
    }
  };

  const patchVideo = async (patch: Partial<VideoState>) => {
    const { error } = await supabase
      .from("curated_videos")
      .update(patch)
      .eq("video_id", videoId);
    if (error) throw error;
    return patch;
  };

  const deleteVideo = () =>
    run("Video deleted", "video.delete", async () => {
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

  const editHalalScore = () =>
    run("Halal score updated", "video.edit_halal_score", async () => {
      const raw = window.prompt(
        "New halal score (0–100)?",
        String(state?.halal_score ?? 85),
      );
      if (raw === null) throw new Error("cancelled");
      const score = Math.max(0, Math.min(100, Number(raw)));
      if (!Number.isFinite(score)) throw new Error("Invalid score");
      return patchVideo({ halal_score: score });
    });

  const editMetadata = () =>
    run("Title updated", "video.edit_metadata", async () => {
      const nextTitle = window.prompt("New title?", title ?? "");
      if (!nextTitle) throw new Error("cancelled");
      const { error } = await supabase
        .from("curated_videos")
        .update({ title: nextTitle })
        .eq("video_id", videoId);
      if (error) throw error;
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
            {/* Visibility */}
            {state?.is_hidden ? (
              <DropdownMenuItem
                onClick={() =>
                  run("Video unhidden", "video.unhide", () =>
                    patchVideo({ is_hidden: false }),
                  )
                }
              >
                <Eye className="mr-2 h-4 w-4" /> Unhide
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  run("Video hidden", "video.hide", () =>
                    patchVideo({ is_hidden: true }),
                  )
                }
              >
                <EyeOff className="mr-2 h-4 w-4" /> Hide
              </DropdownMenuItem>
            )}

            {state?.is_archived ? (
              <DropdownMenuItem
                onClick={() =>
                  run("Video unarchived", "video.unarchive", () =>
                    patchVideo({ is_archived: false }),
                  )
                }
              >
                <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  run("Video archived", "video.archive", () =>
                    patchVideo({ is_archived: true }),
                  )
                }
              >
                <Archive className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            )}

            {state?.is_featured ? (
              <DropdownMenuItem
                onClick={() =>
                  run("Unfeatured", "video.unfeature", () =>
                    patchVideo({ is_featured: false }),
                  )
                }
              >
                <StarOff className="mr-2 h-4 w-4" /> Unfeature
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  run("Featured", "video.feature", () =>
                    patchVideo({ is_featured: true }),
                  )
                }
              >
                <Star className="mr-2 h-4 w-4" /> Feature
              </DropdownMenuItem>
            )}

            {state?.is_pinned ? (
              <DropdownMenuItem
                onClick={() =>
                  run("Unpinned", "video.unpin", () =>
                    patchVideo({ is_pinned: false }),
                  )
                }
              >
                <PinOff className="mr-2 h-4 w-4" /> Unpin
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  run("Pinned", "video.pin", () =>
                    patchVideo({ is_pinned: true }),
                  )
                }
              >
                <Pin className="mr-2 h-4 w-4" /> Pin
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* AI override */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ShieldCheck className="mr-2 h-4 w-4" /> Override AI
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() =>
                    run("Marked safe", "video.mark_safe", () =>
                      patchVideo({ halal_score: 95 }),
                    )
                  }
                >
                  <ShieldCheck className="mr-2 h-4 w-4" /> Mark safe
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    run("Marked unsafe", "video.mark_unsafe", () =>
                      patchVideo({ halal_score: 10 }),
                    )
                  }
                >
                  <ShieldAlert className="mr-2 h-4 w-4" /> Mark unsafe
                </DropdownMenuItem>
                <DropdownMenuItem onClick={editHalalScore}>
                  <Pencil className="mr-2 h-4 w-4" /> Set custom score
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Metadata */}
            <DropdownMenuItem onClick={editMetadata}>
              <Pencil className="mr-2 h-4 w-4" /> Edit metadata
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Removal from surfaces (hard delete from curated) */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ListX className="mr-2 h-4 w-4" /> Remove from surface
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {[
                  ["homepage", "Homepage"],
                  ["recommendations", "Recommendations"],
                  ["search", "Search"],
                  ["trending", "Trending"],
                  ["categories", "Categories"],
                  ["channel_listings", "Channel listings"],
                ].map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() =>
                      run(
                        `Removed from ${label}`,
                        `video.remove_from.${key}`,
                        async () => {
                          await supabase
                            .from("curated_videos")
                            .delete()
                            .eq("video_id", videoId);
                        },
                      )
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {channelTitle && (
              <DropdownMenuItem onClick={banChannel} className="text-destructive">
                <Ban className="mr-2 h-4 w-4" /> Ban channel platform-wide
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild>
              <a href={`/owner?target=${videoId}`}>
                <History className="mr-2 h-4 w-4" /> View moderation history
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
