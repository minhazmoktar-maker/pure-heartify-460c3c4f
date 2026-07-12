import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Playlist {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: "private" | "unlisted" | "public";
  cover_video_id: string | null;
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  video_id: string;
  position: number;
  added_at: string;
}

export function usePlaylists() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery<Playlist[]>({
    queryKey: ["playlists", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Playlist[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: async (input: { title: string; description?: string; visibility?: Playlist["visibility"] }) => {
      if (!user) throw new Error("Sign in to create playlists");
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          owner_id: user.id,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          visibility: input.visibility ?? "private",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Playlist;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      toast({ title: "Playlist created" });
    },
    onError: (e: Error) => toast({ title: "Could not create", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Playlist, "title" | "description" | "visibility" | "cover_video_id">> }) => {
      const { error } = await supabase.from("playlists").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playlists"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playlists"] }),
  });

  const addItem = useMutation({
    mutationFn: async ({ playlistId, videoId }: { playlistId: string; videoId: string }) => {
      const { count } = await supabase
        .from("playlist_items")
        .select("*", { count: "exact", head: true })
        .eq("playlist_id", playlistId);
      const { error } = await supabase
        .from("playlist_items")
        .insert({ playlist_id: playlistId, video_id: videoId, position: count ?? 0 });
      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.invalidateQueries({ queryKey: ["playlist_items", playlistId] });
      toast({ title: "Added to playlist" });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("duplicate") ? "Already in playlist" : e?.message ?? "Failed";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const removeItem = useMutation({
    mutationFn: async ({ playlistId, videoId }: { playlistId: string; videoId: string }) => {
      const { error } = await supabase
        .from("playlist_items")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("video_id", videoId);
      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.invalidateQueries({ queryKey: ["playlist_items", playlistId] });
    },
  });

  return { playlists: listQuery.data ?? [], isLoading: listQuery.isLoading, create, update, remove, addItem, removeItem };
}

export function usePlaylist(id: string | undefined) {
  return useQuery({
    queryKey: ["playlist", id],
    queryFn: async () => {
      if (!id) return null;
      const [{ data: pl }, { data: items }] = await Promise.all([
        supabase.from("playlists").select("*").eq("id", id).maybeSingle(),
        supabase.from("playlist_items").select("*").eq("playlist_id", id).order("position"),
      ]);
      return { playlist: pl as Playlist | null, items: (items ?? []) as PlaylistItem[] };
    },
    enabled: !!id,
  });
}
