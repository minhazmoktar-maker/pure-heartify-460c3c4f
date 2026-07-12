import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type NegativeReason = "not_interested" | "dislike" | "already_watched" | "offensive" | "other";

export function useHiddenVideos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hidden_videos", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase
        .from("user_hidden_videos")
        .select("video_id")
        .eq("user_id", user.id)
        .limit(5000);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.video_id));
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useNegativeFeedback() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const notInterested = useMutation({
    mutationFn: async ({ videoId, reason = "not_interested" }: { videoId: string; reason?: NegativeReason }) => {
      if (!user) throw new Error("Sign in to personalize your feed");
      // Idempotent hide
      const { error: hideErr } = await supabase
        .from("user_hidden_videos")
        .upsert({ user_id: user.id, video_id: videoId, reason }, { onConflict: "user_id,video_id" });
      if (hideErr) throw hideErr;
      // Signal the ranker
      await supabase.from("recommendation_events").insert({
        user_id: user.id,
        video_id: videoId,
        event_type: reason,
        surface: "for_you",
        reasons: { source: "negative_feedback" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hidden_videos"] });
      qc.invalidateQueries({ queryKey: ["for_you"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      toast({ title: "Got it — we'll show less like this" });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const undo = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) return;
      await supabase.from("user_hidden_videos").delete().eq("user_id", user.id).eq("video_id", videoId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hidden_videos"] }),
  });

  return { notInterested, undo };
}
