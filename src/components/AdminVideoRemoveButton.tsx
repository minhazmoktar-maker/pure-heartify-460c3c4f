import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Floating admin control that lets the super-admin remove a video from the
 * whole platform. Invisible for non-admins.
 */
export function AdminVideoRemoveButton({ videoId, title }: { videoId: string; title?: string }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
    supabase
      .from("removed_videos").select("id").eq("video_id", videoId).maybeSingle()
      .then(({ data }) => setRemoved(!!data));
  }, [user, videoId]);

  if (!user || !isAdmin) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (removed) {
        const { error } = await supabase.from("removed_videos").delete().eq("video_id", videoId);
        if (error) throw error;
        setRemoved(false);
        toast.success("Video restored to platform");
      } else {
        const reason = window.prompt("Reason for removing this video?", "Inappropriate content") ?? "Inappropriate content";
        const { error } = await supabase.from("removed_videos").insert({
          video_id: videoId, reason, removed_by: user.id,
        });
        if (error) throw error;
        // Also cascade to curated_videos so it disappears from feeds immediately.
        await supabase.from("curated_videos").delete().eq("video_id", videoId);
        setRemoved(true);
        toast.success(`Removed "${title ?? videoId}" from the platform`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update removal status");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={removed ? "outline" : "destructive"}
      onClick={toggle}
      disabled={busy}
      className="gap-1.5"
    >
      {removed ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
      {removed ? "Restore video" : "Remove video"}
    </Button>
  );
}
