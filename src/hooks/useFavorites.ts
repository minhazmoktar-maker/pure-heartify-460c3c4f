import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { growth } from "@/lib/growthEvents";

export interface FavoriteVideo {
  id: string;
  video_id: string;
  video_title: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const favoritesQuery = useQuery<FavoriteVideo[]>({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const isFavorite = (videoId: string) =>
    favoritesQuery.data?.some((f) => f.video_id === videoId) ?? false;

  const toggleFavorite = useMutation({
    mutationFn: async ({
      videoId,
      title,
      channel,
      thumbnail,
    }: {
      videoId: string;
      title: string;
      channel: string;
      thumbnail: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const existing = favoritesQuery.data?.find((f) => f.video_id === videoId);
      if (existing) {
        const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
        if (error) throw error;
        growth.favoriteRemoved(videoId);
        return { action: "removed" as const };
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          video_id: videoId,
          video_title: title,
          channel_title: channel,
          thumbnail_url: thumbnail,
        });
        if (error) throw error;
        growth.favoriteAdded(videoId);
        return { action: "added" as const };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast({
        title: result.action === "added" ? "Bookmarked!" : "Removed from bookmarks",
        duration: 2000,
      });
    },
    onError: () => {
      toast({ title: "Failed to update bookmark", variant: "destructive", duration: 2000 });
    },
  });

  return { favorites: favoritesQuery.data ?? [], isFavorite, toggleFavorite, isLoading: favoritesQuery.isLoading };
}
