import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { growth } from "@/lib/growthEvents";
import { requestContextualPush } from "@/components/PushPermissionPrompt";

export interface FavoriteVideo {
  id: string;
  video_id: string;
  video_title: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

const ANON_KEY = "heartify.favorites.anon.v1";

function loadAnon(): FavoriteVideo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANON_KEY);
    return raw ? (JSON.parse(raw) as FavoriteVideo[]) : [];
  } catch {
    return [];
  }
}

function saveAnon(list: FavoriteVideo[]) {
  try {
    localStorage.setItem(ANON_KEY, JSON.stringify(list));
  } catch {
    // ignore quota
  }
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const favoritesQuery = useQuery<FavoriteVideo[]>({
    queryKey: ["favorites", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user) return loadAnon();
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Migrate anonymous bookmarks into the account on first sign-in.
  useEffect(() => {
    if (!user) return;
    const anon = loadAnon();
    if (anon.length === 0) return;
    (async () => {
      const rows = anon.map((f) => ({
        user_id: user.id,
        video_id: f.video_id,
        video_title: f.video_title,
        channel_title: f.channel_title,
        thumbnail_url: f.thumbnail_url,
      }));
      const { error } = await supabase
        .from("favorites")
        .upsert(rows, { onConflict: "user_id,video_id", ignoreDuplicates: true });
      if (!error) {
        saveAnon([]);
        queryClient.invalidateQueries({ queryKey: ["favorites"] });
      }
    })();
  }, [user, queryClient]);

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
      if (!user) {
        const current = loadAnon();
        const existing = current.find((f) => f.video_id === videoId);
        if (existing) {
          saveAnon(current.filter((f) => f.video_id !== videoId));
          growth.favoriteRemoved(videoId);
          return { action: "removed" as const };
        }
        const next: FavoriteVideo = {
          id: `anon-${videoId}`,
          video_id: videoId,
          video_title: title,
          channel_title: channel,
          thumbnail_url: thumbnail,
          created_at: new Date().toISOString(),
        };
        saveAnon([next, ...current]);
        growth.favoriteAdded(videoId);
        return { action: "added" as const };
      }
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
        title: result.action === "added"
          ? user ? "Bookmarked!" : "Saved on this device — sign in to sync"
          : "Removed from bookmarks",
        duration: 2500,
      });
    },
    onError: () => {
      toast({ title: "Failed to update bookmark", variant: "destructive", duration: 2000 });
    },
  });

  return { favorites: favoritesQuery.data ?? [], isFavorite, toggleFavorite, isLoading: favoritesQuery.isLoading };
}
