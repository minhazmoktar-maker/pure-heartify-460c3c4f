import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useUserBlocks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ["user_blocks", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user) return [] as { id: string; blocked_user_id: string; created_at: string }[];
      const { data, error } = await supabase
        .from("user_blocks")
        .select("id,blocked_user_id,created_at")
        .eq("blocker_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isBlocked = (uid: string) => (listQuery.data ?? []).some((b) => b.blocked_user_id === uid);

  const block = useMutation({
    mutationFn: async (uid: string) => {
      if (!user) throw new Error("Sign in to block");
      if (uid === user.id) throw new Error("You cannot block yourself");
      const { error } = await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_blocks"] });
      qc.invalidateQueries({ queryKey: ["video_comments"] });
      toast({ title: "User blocked" });
    },
    onError: (e: Error) => toast({ title: "Could not block", description: e.message, variant: "destructive" }),
  });

  const unblock = useMutation({
    mutationFn: async (uid: string) => {
      if (!user) throw new Error("Sign in");
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_blocks"] });
      qc.invalidateQueries({ queryKey: ["video_comments"] });
    },
  });

  return { blocks: listQuery.data ?? [], isBlocked, block, unblock };
}
