import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Appeal {
  id: string;
  user_id: string;
  decision_id: string | null;
  subject_kind: "video" | "comment" | "account" | "channel";
  subject_ref: string;
  reason: string;
  status: "open" | "approved" | "denied" | "withdrawn";
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useAppeals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery<Appeal[]>({
    queryKey: ["appeals", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("appeals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Appeal[];
    },
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async (input: {
      subjectKind: Appeal["subject_kind"];
      subjectRef: string;
      reason: string;
      decisionId?: string | null;
    }) => {
      if (!user) throw new Error("Sign in to appeal");
      const reason = input.reason.trim();
      if (reason.length < 10) throw new Error("Please provide at least 10 characters");
      const { data, error } = await supabase
        .from("appeals")
        .insert({
          user_id: user.id,
          decision_id: input.decisionId ?? null,
          subject_kind: input.subjectKind,
          subject_ref: input.subjectRef,
          reason,
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Appeal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appeals"] });
      toast({ title: "Appeal submitted", description: "We'll review it and respond." });
    },
    onError: (e: Error) => toast({ title: "Could not submit appeal", description: e.message, variant: "destructive" }),
  });

  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appeals").update({ status: "withdrawn" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appeals"] }),
  });

  return { appeals: listQuery.data ?? [], isLoading: listQuery.isLoading, submit, withdraw };
}
