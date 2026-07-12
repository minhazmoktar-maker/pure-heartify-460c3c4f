import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FollowedChannel {
  channel_id: string;
  title: string | null;
  handle: string | null;
  youtube_channel_id: string;
  followed_at: string;
}

export function useFollows() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery<FollowedChannel[]>({
    queryKey: ["channel_follows", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("channel_follows")
        .select("channel_id,created_at,approved_channels(id,title,handle,youtube_channel_id)")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        channel_id: r.channel_id,
        title: r.approved_channels?.title ?? null,
        handle: r.approved_channels?.handle ?? null,
        youtube_channel_id: r.approved_channels?.youtube_channel_id ?? "",
        followed_at: r.created_at,
      }));
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFollowing = (channelId: string) =>
    (listQuery.data ?? []).some((f) => f.channel_id === channelId);

  const toggle = useMutation({
    mutationFn: async (channelId: string) => {
      if (!user) throw new Error("Sign in to follow channels");
      const following = isFollowing(channelId);
      if (following) {
        const { error } = await supabase
          .from("channel_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("channel_id", channelId);
        if (error) throw error;
        return { following: false };
      }
      const { error } = await supabase
        .from("channel_follows")
        .insert({ follower_id: user.id, channel_id: channelId });
      if (error) throw error;
      return { following: true };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["channel_follows"] });
      toast({ title: res.following ? "Following" : "Unfollowed" });
    },
    onError: (e: Error) => toast({ title: "Could not update follow", description: e.message, variant: "destructive" }),
  });

  return { follows: listQuery.data ?? [], isLoading: listQuery.isLoading, isFollowing, toggle };
}
