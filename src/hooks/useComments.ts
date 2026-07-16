import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CommentRow {
  id: string;
  video_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  status: "visible" | "hidden" | "removed";
  likes_count: number;
  replies_count: number;
  edited_at: string | null;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
  liked_by_me?: boolean;
}

async function fetchComments(videoId: string, userId: string | undefined): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("video_comments")
    .select("id,video_id,user_id,parent_id,body,status,likes_count,replies_count,edited_at,created_at")
    .eq("video_id", videoId)
    .eq("status", "visible")
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  const rows = (data ?? []) as CommentRow[];
  if (rows.length === 0) return rows;

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const [{ data: profs }, { data: blocks }, { data: myLikes }] = await Promise.all([
    // RLS restricts profiles to auth.uid() = user_id, so anonymous callers get
    // a 401 (no anon SELECT grant) and authed users only ever see their own
    // row here. Skip the join for anon; authed users still resolve their own
    // name, others fall back to the generic label.
    userId
      ? supabase.from("profiles").select("user_id,display_name,handle,avatar_url").in("user_id", userIds)
      : Promise.resolve({ data: [] as Array<{ user_id: string; display_name: string | null; handle: string | null; avatar_url: string | null }> }),
    userId
      ? supabase.from("user_blocks").select("blocked_user_id").eq("blocker_id", userId)
      : Promise.resolve({ data: [] as { blocked_user_id: string }[] }),
    userId
      ? supabase
          .from("comment_reactions")
          .select("comment_id")
          .eq("user_id", userId)
          .in("comment_id", rows.map((r) => r.id))
      : Promise.resolve({ data: [] as { comment_id: string }[] }),
  ]);
  const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));
  const blocked = new Set((blocks ?? []).map((b) => b.blocked_user_id));
  const likedSet = new Set((myLikes ?? []).map((l) => l.comment_id));
  return rows
    .filter((r) => !blocked.has(r.user_id))
    .map((r) => {
      const p = profMap.get(r.user_id);
      return {
        ...r,
        author_name: p?.display_name ?? p?.handle ?? "Muslim",
        author_avatar: p?.avatar_url ?? null,
        liked_by_me: likedSet.has(r.id),
      };
    });
}

export function useComments(videoId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ["video_comments", videoId, user?.id ?? "anon"],
    queryFn: () => fetchComments(videoId!, user?.id),
    enabled: !!videoId,
    staleTime: 30_000,
  });

  const post = useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: string | null }) => {
      if (!user) throw new Error("Sign in to comment");
      if (!videoId) throw new Error("Missing video");
      const trimmed = body.trim();
      if (trimmed.length < 1 || trimmed.length > 2000) throw new Error("Comment must be 1–2000 chars");
      const { error, data } = await supabase
        .from("video_comments")
        .insert({ video_id: videoId, user_id: user.id, body: trimmed, parent_id: parentId ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video_comments", videoId] });
    },
    onError: (e: Error) => toast({ title: "Could not post", description: e.message, variant: "destructive" }),
  });

  const edit = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await supabase.from("video_comments").update({ body: body.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video_comments", videoId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("video_comments")
        .update({ status: "removed", deleted_at: new Date().toISOString(), body: "[removed]" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video_comments", videoId] }),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      if (!user) throw new Error("Sign in to react");
      if (liked) {
        const { error } = await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", id)
          .eq("user_id", user.id)
          .eq("kind", "like");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comment_reactions")
          .insert({ comment_id: id, user_id: user.id, kind: "like" });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video_comments", videoId] }),
  });

  return { ...listQuery, post, edit, remove, toggleLike };
}
